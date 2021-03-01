const http = require('http');
const request = require('request');
const moment = require('moment');
require("moment-duration-format");

const hour = 1000 * 60 * 60
const day = hour * 24
const timeframe_windowsize = day
const timeframe_to = Date.now()

// Check Env & CLI
const api_token = process.env.INSTANA_API_TOKEN
if (process.argv.length != 4 || !api_token) {
    console.error("Serer Usage: INSTANA_API_TOKEN=<INSTANA_API_TOKEN> node report.js <KUBERNETES_CLUSTER_NAME> <INSTANA_API_URL>")
    return
}
const k8s_cluster = process.argv[2]
const api_url = process.argv[3]


// --- Build Request ---

function buildRequestOptions(groupBy, metrics, type) {
    const body = {
        "timeFrame": {
            "to": timeframe_to,
            "windowSize": timeframe_windowsize
        },
        "type": type,
        "tagFilterExpression": {
            "type": "TAG_FILTER",
            "name": "kubernetes.cluster.name",
            "value": k8s_cluster,
            "operator": "EQUALS"
        },
        "groupBy": [groupBy.groupByKey],
        "metrics": buildMetrics(metrics),
        "pagination": {
            "retrievalSize": 200
        }
    }

    const options = {
        url: api_url + 'infrastructure-monitoring/explore/groups',
        headers: {
            'authorization': 'apiToken ' + api_token,
            'content-type': 'application/json'
        },
        body: JSON.stringify(body)
    };
    return options
}

function buildMetrics(specs) {
    var result = [];
    specs.forEach(spec => {
        spec.aggregations.forEach(aggregation => {
            result.unshift({ "metric": spec.metric, "aggregation": aggregation })
        })
    });
    return result;
}



// --- Request ---

function requestReport(groupBy, metrics, type, callback) {

    const options = buildRequestOptions(groupBy, metrics, type)

    request.post(options, function (error, response, body) {
        if (error) console.error('error:', error);
        if (response.statusCode != 200) {
            console.debug('SatusCode:', response && response.statusCode);
            return
        }
        var body = JSON.parse(body)
        if (!body.data || !body.data.items) {
            console.error("Unexpected result: ", body)
            return
        }

        var report = buildReport(body.data, groupBy)
        callback(report)
    });
}


// --- Server ---

console.log("Starting server on 8080")
console.log("Waiting on request")

http.createServer(function (req, res) {
    console.log("Received Request")

    // CORS
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    var dockerCpuMetrics = { type: "docker", metric: "cpu.total_usage", aggregations: ["MEAN", "P95", "P99", "MAX"] }
    var dockerMemoryMetrics = { type: "docker", metric: "memory.usage", aggregations: ["MEAN", "P95", "P99", "MAX"] }

    var groupByNamespace = { groupByKey: "kubernetes.namespace.name", groupByLabel: "Namespace" }
    // TODO parameterize group by
    //TODO var groupByLabel = { groupByKey: "kubernetes.pod.label", groupByLabel: "Pod Label" }

    requestReport(groupByNamespace, [dockerCpuMetrics, dockerMemoryMetrics], "docker", function (report1) {
        // TODO  requestReport(groupByLabel, [dockerCpuMetrics, dockerMemoryMetrics], function (report2) {
        res.setHeader('Content-Type', 'application/json');
        res.write(JSON.stringify(report1))
        //TODO res.write(report2)
        res.end()
        //})
    })
}).listen(8080);



// --- Build Report ---

function buildReport(data, groupBy) {
    var report = {};
    report.description = 'Usage Report for Kubernetes cluster "' + k8s_cluster + '" with ' + data.items.length + ' ' + groupBy.groupByLabel + "s."
    report.from = moment(timeframe_to - timeframe_windowsize).format('DD MMMM YYYY HH:mm:ss');
    report.to = moment(timeframe_to).format('DD MMMM YYYY HH:mm:ss');
    report.header = "Type,Group,Container,CPU Usage (Mean),CPU Usage (P95),CPU Usage (P99),CPU Usage (Max),Memory Usage (Mean),Memory Usage (P95),Memory Usage (P99),Memory Usage (Max)"
    report.data = []
    data.items.forEach(item => {
        var lineitem = {}
        lineitem.type = groupBy.groupByLabel
        lineitem.group = item.tags[groupBy.groupByKey]
        lineitem.count = item.count
        lineitem.cpu = {}
        lineitem.cpu.total_usage = {}
        lineitem.cpu.total_usage.mean = metricStringPercent(item.metrics, "cpu.total_usage.MEAN")
        lineitem.cpu.total_usage.p95 = metricStringPercent(item.metrics, "cpu.total_usage.P95")
        lineitem.cpu.total_usage.p99 = metricStringPercent(item.metrics, "cpu.total_usage.P99")
        lineitem.cpu.total_usage.max = metricStringPercent(item.metrics, "cpu.total_usage.MAX")
        lineitem.memory = {}
        lineitem.memory.usage = {}
        lineitem.memory.usage.mean = metricStringByte(item.metrics, "memory.usage.MEAN")
        lineitem.memory.usage.p95 = metricStringByte(item.metrics, "memory.usage.P95")
        lineitem.memory.usage.p99 = metricStringByte(item.metrics, "memory.usage.P99")
        lineitem.memory.usage.max = metricStringByte(item.metrics, "memory.usage.MAX")

        report.data.unshift(lineitem)
    });
    return report;
}

function metricStringPercent(metrics, metricKey, label) {
    // should alwyways be metrics[metricKey].length == 1
    if (metrics[metricKey]) {
        return (metrics[metricKey][0][1] * 100).toFixed(2) + "%";
    }
}

function metricStringByte(metrics, metricKey, label) {
    if (metrics[metricKey]) {
        return (metrics[metricKey][0][1] / 1024 / 1024).toFixed(2) + "MB";
    }
}


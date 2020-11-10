const http = require('http');
const request = require('request');
const moment = require('moment');
require("moment-duration-format");

const hour = 1000 * 60 * 60
const day = hour * 24
const timeframe_windowsize = hour * 12 //TODO test with a full day
const timeframe_to = Date.now()
const granularity = hour * 12

// Check Env & CLI
const api_token = process.env.INSTANA_API_TOKEN
if (process.argv.length != 4 || !api_token) {
    console.error("Serer Usage: INSTANA_API_TOKEN=<INSTANA_API_TOKEN> node report.js <KUBERNETES_CLUSTER_NAME> <INSTANA_API_URL>")
    return
}
const k8s_cluster = process.argv[2]
const api_url = process.argv[3]




// --- Build Request ---

function buildRequestOptions(groupBy, metrics) {
    const body = {
        "timeFrame": {
            "to": timeframe_to,
            "windowSize": timeframe_windowsize
        },
        "type": metrics.type,
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
            result.unshift({ "metric": spec.metric, "aggregation": aggregation, "granularity": spec.granularity })
        })
    });
    return result;
}



// --- Request ---

function requestReport(groupBy, metrics, callback) {

    const options = buildRequestOptions(groupBy, metrics)

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
http.createServer(function (req, res) {
    console.log("Received Request")

    var dockerCpuMetrics = { type: "docker", granularity: granularity, metric: "cpu.total_usage", aggregations: ["MEAN", "P95", "P99", "MAX"] }
    var dockerMemoryMetrics = { type: "docker", granularity: granularity, metric: "memory.usage", aggregations: ["MEAN", "P95", "P99", "MAX"] }

    var groupByNamespace = { groupByKey: "kubernetes.namespace.name", groupByLabel: "Namespace" }
    var groupByLabel = { groupByKey: "kubernetes.pod.label", groupByLabel: "Pod Label" }

    requestReport(groupByNamespace, [dockerCpuMetrics, dockerMemoryMetrics], function (report1) {
        requestReport(groupByLabel, [dockerCpuMetrics, dockerMemoryMetrics], function (report2) {
            res.write(report1)
            res.write(report2)
            res.end()
        }
        )
    })
}).listen(8080);





// --- Build Report ---

function buildReport(data, groupBy) {
    var report = "";
    report += 'Usage Report for Kubernetes cluster "' + k8s_cluster + '" with ' + data.items.length + ' ' + groupBy.groupByLabel + "s. "
    report += "From: " + moment(timeframe_to - timeframe_windowsize).format('DD MMMM YYYY HH:mm:ss');
    report += " to: " + moment(timeframe_to).format('DD MMMM YYYY HH:mm:ss') + "\n";
    report += "Type,Group,Container,CPU Usage (Mean),CPU Usage (P95),CPU Usage (P99),CPU Usage (Max),Memory Usage (Mean),Memory Usage (P95),Memory Usage (P99),Memory Usage (Max)\n"
    data.items.forEach(item => {
        report += groupBy.groupByLabel + "," + item.tags[groupBy.groupByKey] + "," + item.count + ","
        report += metricStringPercent(item.metrics, "cpu.total_usage.MEAN." + timeframe_windowsize) + ","
        report += metricStringPercent(item.metrics, "cpu.total_usage.P95." + timeframe_windowsize) + ","
        report += metricStringPercent(item.metrics, "cpu.total_usage.P99." + timeframe_windowsize) + ","
        report += metricStringPercent(item.metrics, "cpu.total_usage.MAX." + timeframe_windowsize) + ","
        report += metricStringByte(item.metrics, "memory.usage.MEAN." + timeframe_windowsize) + ","
        report += metricStringByte(item.metrics, "memory.usage.P95." + timeframe_windowsize) + ","
        report += metricStringByte(item.metrics, "memory.usage.P99." + timeframe_windowsize) + ","
        report += metricStringByte(item.metrics, "memory.usage.MAX." + timeframe_windowsize)
        report += "\n"
    });
    return report;
}

function metricStringPercent(metrics, metricKey, label) {
    if (metrics[metricKey]) { // TODO for each metric not just [0][1]
        return (metrics[metricKey][0][1] * 100).toFixed(2) + "%";
    }
}

function metricStringByte(metrics, metricKey, label) {
    if (metrics[metricKey]) { // TODO for each metric not just [0][1]
        return (metrics[metricKey][0][1] / 1024 / 1024).toFixed(2) + "MB";
    }
}


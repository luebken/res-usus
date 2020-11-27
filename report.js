const request = require('request');
const moment = require('moment');
require("moment-duration-format");

const hour = 1000 * 60 * 60
const day = hour * 24

// Question 4: Why doesn't this work with 24 hours
const timeframe_windowsize = hour * 12 
const timeframe_to = Date.now()

// Question 1: Test with different timeframe_to. 
// As I was testing I couldn't get different timezones and the 
// const timeframe_to = Date.parse('2020-11-26 15:00:00')

// Question 2: If I decrease the granularity here I would expect multiple metrics. 
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

function requestReport(groupBy, metrics) {

    const options = buildRequestOptions(groupBy, metrics)

    request.post(options, function (error, response, body) {
        if (error) console.error('error:', error);
        if (response.statusCode != 200) {
            console.debug('SatusCode:', response && response.statusCode);
            console.debug('Body:', body);
            return
        }
        var body = JSON.parse(body)
        if (!body.data || !body.data.items) {
            console.error("Unexpected result: ", body)
            return
        }

        printReport(body.data, groupBy)
    });
}


// --- Server ---


console.log("Received Request")

var dockerCpuMetrics = { type: "docker", granularity: granularity, metric: "cpu.total_usage", aggregations: ["MEAN"] }
var groupByNamespace = { groupByKey: "kubernetes.namespace.name", groupByLabel: "Namespace" }

requestReport(groupByNamespace, [dockerCpuMetrics])





// --- Build Report ---

function printReport(data, groupBy) {
    console.log("\n")
    console.log('Usage Report for Kubernetes cluster "' + k8s_cluster + '" with ' + data.items.length + ' ' + groupBy.groupByLabel + "s. ")
    console.log("From " + moment(timeframe_to - timeframe_windowsize).toString());
    console.log("To " + moment(timeframe_to).toString());
    console.log("\n")

    data.items.forEach(item => {
        console.log(item.tags)
        console.log(item.metrics)
        if (item.metrics['cpu.total_usage.MEAN.43200000'])
            // Question 3: What is this metric timestamp?
            // Why is this different from timeframe_to?
            console.log("Metric timestamp: " + moment(item.metrics['cpu.total_usage.MEAN.43200000'][0][0]).toString())
        console.log("\n")
    });
}





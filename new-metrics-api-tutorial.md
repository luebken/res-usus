# How to query the new metrics API

## Configuration Paramaters

* INSTANA_API_TOKEN
* INSTANA_BASE_URL

## Test Access

```
curl --insecure --request GET --url $INSTANA_BASE_URL/api/instana/health --header "authorization: apiToken $INSTANA_API_TOKEN"
```

## ...

```
curl --request POST \
--url $INSTANA_BASE_URL/api/infrastructure-monitoring/explore/groups \
--header "authorization: apiToken $INSTANA_API_TOKEN" \
--header 'content-type: application/json' \
--data '{"timeFrame":{"to":1616574699723,"windowSize":604800000},"type":"docker","tagFilterExpression":{"type":"TAG_FILTER","name":"kubernetes.cluster.name","value":"do-mdl-k8s-cluster","operator":"EQUALS"},"groupBy":["kubernetes.namespace.name"],"metrics":[{"metric":"cpu.total_usage","aggregation":"MAX"}],"pagination":{"retrievalSize":200}}'
```
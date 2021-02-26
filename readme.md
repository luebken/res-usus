# Res-Usus

Res-Usus (Latin: things used) is a trivial demo of Instana's new API to generate a K8s usage report. Note that the new API is still on Beta. Please reach out to matthias.luebken@instana.io for further information.

## Usage

    # Start the server:
    $ INSTANA_API_TOKEN=<INSTANA_API_TOKEN> node report.js <KUBERNETES_CLUSTER_NAME> <INSTANA_API_URL>
    # Request CSV
    curl localhost:8080
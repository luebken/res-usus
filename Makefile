build:
	cd backend; npm install
	cd frontend; yarn

run-frontend: 
	cd frontend; yarn start

build-backend-docker:
	cd backend; docker build -t luebken/res-usus .

push-docker: build-backend-docker
	docker push luebken/res-usus

run-backend-docker: 
	docker run -e INSTANA_API_TOKEN=${INSTANA_API_TOKEN} -p 8080:8080 luebken/res-usus ${KUBERNETES_CLUSTER_NAME} ${INSTANA_BASE_URL}
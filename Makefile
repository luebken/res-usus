build:
	cd backend; npm install
	cd backend; docker build -t luebken/res-usus .

push:
	docker push luebken/res-usus

run-backend-dev:
	cd backend; node report.js "do-mdl-k8s-cluster" "https://test-instana.pink.instana.rocks/api/"

run-backend: 
	docker run -e INSTANA_API_TOKEN=${INSTANA_API_TOKEN} -p 8080:8080 luebken/res-usus

run-frontend: 
	cd frontend; yarn start
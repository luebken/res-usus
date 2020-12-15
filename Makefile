build:
	cd backend; npm install
	cd frontend; yarn

run-backend:
	cd backend; node report.js "a dummy-cluster" "https://something-something.instana.io/api/"

run-frontend: 
	cd frontend; yarn start

build-docker:
	cd backend; docker build -t luebken/res-usus .
	docker push luebken/res-usus

run-backend-docker: 
	docker run -e INSTANA_API_TOKEN=${INSTANA_API_TOKEN} -p 8080:8080 luebken/res-usus
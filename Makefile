build:
	npm install
	docker build -t luebken/res-usus .
push:
	docker push luebken/res-usus
run: 
	docker run -e INSTANA_API_TOKEN=${INSTANA_API_TOKEN} -p 8080:8080 luebken/res-usus
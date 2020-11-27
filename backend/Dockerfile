FROM node:12
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8080
CMD [ "node", "report.js", "do-mdl-k8s-cluster", "https://test-instana.pink.instana.rocks/api/" ]
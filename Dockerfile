FROM --platform=arm64 node:16-alpine

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY . .
RUN npm install

# Open port 80
EXPOSE 3000

CMD [ "node", "src/server.js" ]
FROM --platform=amd64 node:16-buster-slim

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY . .
RUN npm install
RUN apt-get update
RUN apt-get install -y openssl
RUN npx prisma generate
RUN npx prisma db push
# Open port 80
EXPOSE 4000

CMD [ "npm", "start" ]
FROM --platform=amd64 node:18

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY . .
RUN npm install --force
RUN apt-get update
RUN apt-get install -y openssl
RUN npx prisma generate
# Open port 80
EXPOSE 4000

CMD [ "npm", "start" ]
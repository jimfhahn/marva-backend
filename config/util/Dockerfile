FROM node:14.16.0-alpine3.12

RUN apk add --no-cache git

RUN npm install -g forever nodemon @vue/cli @vue/cli-service-global grunt

WORKDIR /app

EXPOSE 5200

ENTRYPOINT ["/app/startup.sh"]

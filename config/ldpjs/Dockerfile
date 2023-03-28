#FROM adoptopenjdk/openjdk14:jre-14.0.2_12-alpine
FROM --platform=arm64 openjdk:8-jre-alpine

ENV JENA_VERSION apache-jena-3.17.0
RUN mkdir /jena
WORKDIR /jena
RUN wget "http://archive.apache.org/dist/jena/binaries/$JENA_VERSION.zip"

RUN unzip "$JENA_VERSION.zip"

RUN mv -f $JENA_VERSION/* .
RUN rmdir "$JENA_VERSION/"
RUN rm "$JENA_VERSION.zip"

ENV PATH $PATH:/jena/bin

RUN apk add --update nodejs-current npm

RUN node --version

RUN npm install -g forever nodemon

WORKDIR /app

RUN wget 'https://github.com/lcnetdev/ldpjs/archive/d7aee34f2b6acab26ccd714eed2c1e6925f6a642.zip'
RUN unzip d7aee34f2b6acab26ccd714eed2c1e6925f6a642.zip
RUN mv ldpjs-d7aee34f2b6acab26ccd714eed2c1e6925f6a642/* /app && rm -rf ldpjs-d7aee34f2b6acab26ccd714eed2c1e6925f6a642

COPY ./config/ldpjs/ldpjs_startup.sh /app/startup.sh

COPY ./config/ldpjs/ldpjs_server_staging.js /app/server.js

COPY ./config/ldpjs/ldpjs_config_staging.js /app/config/index.js

RUN npm init -y

RUN npm install --save cors fast-xml-parser strnum express

RUN npm install 

EXPOSE 5101

ENTRYPOINT ["forever", "server.js"]
#ENTRYPOINT ["/app/startup.sh"]

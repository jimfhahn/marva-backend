FROM arm32v6/openjdk:8-jre-alpine

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

COPY ./config/ldpjs_startup.sh /app/startup.sh

#ENTRYPOINT ["forever", "server.js"]
ENTRYPOINT ["/app/startup.sh"]

# marva-backend
This repo is a [fork](https://github.com/lcnetdev/marva-backend) of the docker files and configuration for data persistence in the [Marva Editor](https://bibframe.org/) the Library of Congress BIBFRAME editor. After you've turned this on you'll want to start the [front-end](https://github.com/jimfhahn/marva-frontend/) next.

## About this fork
This fork re-organizes some of the configuration to dockerfiles into folders; and points to some pre-built images. It's all in the [docker-compose file](https://github.com/jimfhahn/marva-backend/blob/master/docker-compose.yml).
The fork is also configured with some demonstration paths in the [util API](https://github.com/jimfhahn/marva-backend/blob/master/util-service/server.js) for those interested in posting to Alma or Alma Sandbox. 
## Alma API
A note that the ExLibris create BIB endpoint for BIBFRAME is in (re)development and may change, so it may be behind Alma ExLibris changes. 

The ability to post to Alma has a flag in the front-end that needs to be set to true for the Alma XML structure. The ALMA flag is in the [marva-frontend config file](https://github.com/jimfhahn/marva-frontend/blob/master/src/lib/config.js#L106)


## Docker-compose

### To startup the backend services use 
`docker compose up -d`

### To stop the services 
`docker compose stop`

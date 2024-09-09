FROM node:18-alpine3.16 AS base

RUN apk add yarn
COPY package.json ./
COPY yarn.lock ./
RUN yarn --ignore-scripts

COPY . .

RUN yarn build


FROM node:18-alpine3.16 AS web

COPY --from=base /dist /app/build
COPY package*.json /app/
WORKDIR /app
RUN apk add yarn
RUN --mount=type=cache,target=/yarn-cache yarn --prod --ignore-scripts --cache-folder /yarn-cache
CMD node build/index.js
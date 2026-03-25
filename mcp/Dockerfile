# syntax=docker/dockerfile:1.6

# Build stage
FROM node:20-bullseye AS build
WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src
COPY shared ./shared
COPY servers ./servers
COPY client ./client
COPY config ./config

RUN npm ci
RUN npm run build

# Runtime stage
FROM node:20-bullseye
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY shared ./shared
COPY servers ./servers
COPY client ./client
COPY config ./config
COPY .env.example ./

USER node

ENTRYPOINT ["node", "dist/server.js"]

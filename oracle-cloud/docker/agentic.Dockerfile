FROM node:18-bullseye AS build
WORKDIR /app

COPY agentic-ai/package.json agentic-ai/package-lock.json ./
RUN npm ci

COPY agentic-ai/ ./
RUN npm run build

FROM node:18-bullseye
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/package.json /app/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist

EXPOSE 4318
CMD ["node", "dist/http/server.js"]

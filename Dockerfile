# Multi-stage build: compiles shared/server/client, then ships a single small
# runtime image where the Node server serves both the WebSocket API and the
# built client bundle on one port (see server/src/staticFiles.ts).

FROM node:20-slim AS build
WORKDIR /repo

COPY package.json ./
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN npm install

COPY shared shared
COPY server server
COPY client client

RUN npm run build -w shared
RUN npm run build -w server
RUN npm run build -w client

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
ENV CLIENT_DIST_PATH=/app/client-dist

COPY --from=build /repo/server/package.json ./server/package.json
COPY --from=build /repo/server/dist ./server/dist
COPY --from=build /repo/shared/package.json ./shared/package.json
COPY --from=build /repo/shared/dist ./shared/dist
COPY --from=build /repo/client/dist ./client-dist
COPY --from=build /repo/node_modules ./node_modules

EXPOSE 8080
CMD ["node", "server/dist/index.js"]

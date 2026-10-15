FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=8000 DB_PATH=/data/arcade.db
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY auth.js import.js db.js files.js server.js seed.json ./
COPY public ./public
COPY tools ./tools
RUN mkdir /data && chown node:node /data
USER node
EXPOSE 8000
CMD ["node", "server.js"]

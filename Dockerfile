FROM node:22-slim

WORKDIR /app

COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend/ .

CMD ["node", "src/test-server.js"]

FROM node:22-slim

WORKDIR /app

# Copiar todo el repo
COPY . .

# Build del frontend
RUN cd frontend && npm install && npm run build

# Instalar solo dependencias de producción del backend
RUN cd backend && npm install --omit=dev

WORKDIR /app/backend

EXPOSE 3000

CMD ["node", "src/app.js"]

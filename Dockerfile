### Stage 1: build frontend ###
FROM node:22-slim AS builder

WORKDIR /build

# Install frontend deps & build
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install --include=dev

COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Install backend deps (prod only)
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

### Stage 2: runtime ###
FROM node:22-slim

WORKDIR /app

# Backend code + node_modules
COPY --from=builder /build/backend ./

# Built React app → served as static files
COPY --from=builder /build/frontend/dist ./public

CMD ["node", "src/app.js"]

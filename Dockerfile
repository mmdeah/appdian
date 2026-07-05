### Stage 1: build ###
FROM node:22-slim AS builder

WORKDIR /build

# ── Frontend ──────────────────────────────────────────────────────────────────
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install --include=dev

COPY frontend/ ./frontend/
RUN cd frontend && npm run build --force

# ── Backend ───────────────────────────────────────────────────────────────────
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

# Copiar código fuente del backend (FALTABA ESTO)
COPY backend/ ./backend/

### Stage 2: runtime ###
FROM node:22-slim

WORKDIR /app

# Backend (código + node_modules)
COPY --from=builder /build/backend ./

# Frontend compilado
COPY --from=builder /build/frontend/dist ./public

CMD ["node", "src/app.js"]

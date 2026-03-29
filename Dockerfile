# ---- Stage 1: Build frontend ----
FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: Production ----
FROM node:20-alpine

# Install sqlite3 build dependencies (needed by better-sqlite3 / sqlite3 npm)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install backend dependencies
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && apk del python3 make g++

# Copy backend source
COPY backend/src ./src

# Copy built frontend into backend dist folder (served in production)
COPY --from=frontend-build /app/frontend/dist ./dist

# Create directories for runtime data
RUN mkdir -p /app/data /app/temp_uploads

# Environment
ENV NODE_ENV=production
ENV PORT=5000
ENV CORS_ORIGIN=*

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "src/server.js"]

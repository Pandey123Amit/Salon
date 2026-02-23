# ── Stage 1: Build dashboard ──────────────────────────────
FROM node:20-alpine AS dashboard-build

WORKDIR /build/dashboard
COPY dashboard/package.json dashboard/package-lock.json ./
RUN npm ci

COPY dashboard/ ./
RUN npm run build

# ── Stage 2: Production image ─────────────────────────────
FROM node:20-alpine

RUN apk add --no-cache tini wget \
 && npm install -g pm2 \
 && addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Install backend production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy backend source
COPY server.js ecosystem.config.js ./
COPY src/ ./src/

# Copy built dashboard from stage 1
COPY --from=dashboard-build /build/dashboard/dist ./dashboard/dist

# Create logs directory
RUN mkdir -p /app/logs && chown -R appuser:appgroup /app

USER appuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

ENTRYPOINT ["tini", "--"]
CMD ["pm2-runtime", "ecosystem.config.js", "--env", "production"]

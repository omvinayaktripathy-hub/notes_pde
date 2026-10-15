# ==============================================================================
# PRODUCTION DOCKERFILE
# Multi-stage lightweight Alpine build with non-root security & dumb-init
# ==============================================================================

FROM node:20-alpine AS base

# Install dumb-init for proper signal handling (PID 1)
RUN apk add --no-cache dumb-init

WORKDIR /app

# Install dependencies (utilizing Docker layer caching)
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy application source code
COPY . .

# Create private storage and log folders
RUN mkdir -p storage/uploads logs && \
    chown -R node:node /app

# Switch to non-privileged user for container security
USER node

# Expose internal service port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

# Healthcheck probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "app.js"]

# PiZXel session server (pizxel.uk)
#
# Build:  docker build -t pizxel-engine .
# Run:    docker run -p 3001:3001 -e ENGINE_TOKEN=change-me -v pizxel-data:/data pizxel-engine
#
# Configuration is by environment variable; see README.md ("Session server").

# ---- Build: install dependencies (node-canvas may compile from source) ----
FROM node:22.23.3-bookworm-slim AS build

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      build-essential python3 pkg-config \
      libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
 && npm cache clean --force

# ---- Runtime ----
FROM node:22.23.3-bookworm-slim

# Shared libraries node-canvas links against
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libcairo2 libpango-1.0-0 libpangocairo-1.0-0 \
      libjpeg62-turbo libgif7 librsvg2-2 \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=3001 \
    DATA_ROOT=/data

WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json LICENSE ./
COPY pizxel ./pizxel

# Session data lives in a volume, owned by the non-root user
RUN mkdir -p /data && chown node:node /data
VOLUME /data

USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node_modules/.bin/tsx", "pizxel/start-server.ts"]

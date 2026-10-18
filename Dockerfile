# Barometer in a container. Four stages:
#   deps  installs node_modules once, shared by the others
#   dev   runs `next dev` for compose.dev.yml (code is synced in by `docker compose watch`)
#   build compiles the app with Next's standalone output
#   run   the small production image: the standalone server only, as a non-root user
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:22-alpine AS dev
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 WATCHPACK_POLLING=true
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npx", "next", "dev", "-H", "0.0.0.0"]

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 BUILD_STANDALONE=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN adduser -D -u 10001 barometer
COPY --from=build --chown=barometer /app/.next/standalone ./
COPY --from=build --chown=barometer /app/.next/static ./.next/static
USER barometer
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3000/legal >/dev/null || exit 1
CMD ["node", "server.js"]

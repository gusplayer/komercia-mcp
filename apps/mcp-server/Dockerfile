# syntax=docker/dockerfile:1.7
# -----------------------------------------------------------------------------
# Multi-stage Dockerfile for @komercia-mcp/mcp-server (NestJS, ESM, tsc build)
#
# Build context: monorepo root (komercia-mcp/).
# Stages:
#   deps     — install full workspace deps (cached on lockfile + manifests)
#   build    — compile shared packages + mcp-server with tsc --build
#   migrate  — minimal image that runs scripts/migrate.mjs against Postgres
#   runtime  — production image: deployed dist + prod-only node_modules
# -----------------------------------------------------------------------------

ARG NODE_VERSION=20-alpine
ARG PNPM_VERSION=9.15.0


# =============================================================================
# Stage 1: deps — full install (devDeps included, needed to compile)
# =============================================================================
FROM node:${NODE_VERSION} AS deps
ARG PNPM_VERSION

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=1

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /repo

# Copy lockfile + workspace manifests first to maximise layer cache reuse.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY apps/mcp-server/package.json apps/mcp-server/
COPY apps/discovery/package.json apps/discovery/
COPY packages/shared/package.json packages/shared/
COPY packages/komercia-client/package.json packages/komercia-client/
COPY packages/eslint-config/package.json packages/eslint-config/

# Install everything (incl. devDeps). Frozen lockfile guarantees reproducibility.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile


# =============================================================================
# Stage 2: build — compile workspace packages + mcp-server
# =============================================================================
FROM node:${NODE_VERSION} AS build
ARG PNPM_VERSION

ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=1 \
    NO_COLOR=1

RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /repo

# Bring in installed node_modules from deps stage.
COPY --from=deps /repo /repo

# Copy the rest of the sources needed to build mcp-server and its workspace deps.
COPY tsconfig.base.json turbo.json ./
COPY packages/shared/ packages/shared/
COPY packages/komercia-client/ packages/komercia-client/
COPY packages/eslint-config/ packages/eslint-config/
COPY apps/mcp-server/ apps/mcp-server/

# Build only the mcp-server (turbo resolves the workspace dep graph: shared, komercia-client).
RUN pnpm --filter @komercia-mcp/mcp-server... run build

# Produce a self-contained deploy bundle with prod-only deps + flattened
# workspace packages copied into node_modules. Output: /deploy/mcp-server.
RUN pnpm deploy --filter @komercia-mcp/mcp-server --prod /deploy/mcp-server


# =============================================================================
# Stage 3: migrate — runs scripts/migrate.mjs against the configured DATABASE_URL
# =============================================================================
FROM node:${NODE_VERSION} AS migrate

ENV NODE_ENV=production \
    NO_COLOR=1

WORKDIR /app

# The migration script depends only on `postgres`. Install it directly to keep
# the image small and avoid dragging the full mcp-server runtime.
RUN apk add --no-cache wget \
    && npm install --omit=dev --no-audit --no-fund --silent postgres@3.4.5 \
    && chown -R node:node /app

COPY --chown=node:node scripts/migrate.mjs ./migrate.mjs

USER node

CMD ["node", "migrate.mjs"]


# =============================================================================
# Stage 4: runtime — minimal production image for the NestJS HTTP server
# =============================================================================
FROM node:${NODE_VERSION} AS runtime

ENV NODE_ENV=production \
    NO_COLOR=1 \
    MCP_PORT=3001

WORKDIR /app

# wget is needed for the HEALTHCHECK; tini gives us proper PID-1 signal handling.
RUN apk add --no-cache wget tini \
    && chown -R node:node /app

# Self-contained deploy bundle (dist/ + prod node_modules + package.json).
COPY --from=build --chown=node:node /deploy/mcp-server ./

USER node

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD wget -qO- "http://localhost:${MCP_PORT}/health" || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]

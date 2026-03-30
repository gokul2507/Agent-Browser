FROM node:22-slim AS base

RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Install dependencies
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/core/package.json packages/core/
COPY packages/api/package.json packages/api/
COPY packages/mcp-server/package.json packages/mcp-server/
COPY packages/sdk-js/package.json packages/sdk-js/

RUN pnpm install --frozen-lockfile

# Copy source and build
COPY tsconfig.base.json ./
COPY packages/ packages/

RUN pnpm build

# ── Production image ──
FROM node:22-slim AS production

RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY --from=base /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=base /app/packages/core/package.json packages/core/
COPY --from=base /app/packages/api/package.json packages/api/
COPY --from=base /app/packages/mcp-server/package.json packages/mcp-server/
COPY --from=base /app/packages/sdk-js/package.json packages/sdk-js/

RUN pnpm install --frozen-lockfile --prod

COPY --from=base /app/packages/core/dist packages/core/dist/
COPY --from=base /app/packages/api/dist packages/api/dist/
COPY --from=base /app/packages/mcp-server/dist packages/mcp-server/dist/
COPY --from=base /app/packages/sdk-js/dist packages/sdk-js/dist/

ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=3000

EXPOSE 3000

CMD ["node", "packages/api/dist/index.js"]

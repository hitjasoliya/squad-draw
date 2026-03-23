FROM node:18-alpine AS base

# Stage 1: Prune Workspace
FROM base AS builder
RUN apk update && apk add --no-cache libc6-compat
WORKDIR /app
RUN npm install -g turbo
COPY . .
RUN turbo prune ws-server --docker

# Stage 2: Install and Build
FROM base AS installer
RUN apk update && apk add --no-cache libc6-compat
WORKDIR /app

# Enable corepack for pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json
RUN pnpm --filter @repo/db db:generate
RUN pnpm turbo build --filter=ws-server...

# Stage 3: Serve Application
FROM base AS runner
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 wsserver
USER wsserver

# For raw TS/JS node apps, we need production modules, 
# copy the entire installer stage to retain necessary modules.
COPY --from=installer --chown=wsserver:nodejs /app .

WORKDIR /app/apps/ws-server
EXPOSE 3001
ENV PORT 3001

CMD ["node", "dist/index.js"]

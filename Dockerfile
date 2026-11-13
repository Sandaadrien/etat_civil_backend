
#  BUILD
FROM node:24-bookworm-slim AS build

WORKDIR /app

# Installer OpenSSL pour Prisma
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable

#COPY package.json pnpm-lock.yaml ./
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile \
    --config.dangerously-allow-all-builds=true

COPY . .

# Générer le client Prisma
RUN pnpm exec prisma generate \
    --config prisma7.config.ts

# Compiler NestJS
RUN pnpm run build


# PRODUCTION
FROM node:24-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Installer OpenSSL pour Prisma en production
RUN apt-get update && \
    apt-get install -y --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable

COPY --from=build /app/package.json ./
COPY --from=build /app/pnpm-lock.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/generated ./generated
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma7.config.ts ./

EXPOSE 3000

CMD ["node", "dist/src/main.js"]

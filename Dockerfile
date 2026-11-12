ARG NODE_IMAGE
FROM ${NODE_IMAGE}

RUN apk add --no-cache openssl

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma7.config.ts ./
COPY prisma ./prisma
RUN PRISMA_SKIP_POSTINSTALL_GENERATE=true pnpm install --frozen-lockfile

COPY . .
RUN pnpm exec prisma --config prisma7.config.ts generate \
    && pnpm build \
    && mkdir -p private-uploads \
    && chown node:node private-uploads

USER node

ARG APP_PORT
EXPOSE ${APP_PORT}

CMD ["node", "dist/src/main.js"]

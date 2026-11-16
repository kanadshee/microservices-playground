FROM node:22-alpine AS base
WORKDIR /app
RUN npm install -g pnpm turbo

COPY pnpm-lock.yaml* package.json pnpm-workspace.yaml turbo.json ./
COPY packages/ ./packages/
COPY services/ ./services/
COPY apps/ ./apps/

RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm turbo build

EXPOSE 3000 4001 4002 4011 4012 4013 4021 4022 4031 4032 4041 4051 8080
CMD ["pnpm", "dev"]

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Copy package files AND prisma schema BEFORE npm ci
# (postinstall runs "prisma generate" which needs schema.prisma)
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci

# Migration jobs retain the Prisma CLI; the web runtime stays lightweight.
FROM deps AS migrate
WORKDIR /app
COPY . .
RUN npx prisma generate

# Stage 2: Build the application
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Re-generate Prisma client for the builder environment
RUN npx prisma generate

# Cap build heap so concurrent Cloud Build jobs do not reserve unnecessary memory.
ENV NODE_OPTIONS="--max-old-space-size=2048"

# Build-time stubs — Next.js page data collection runs server code during build.
# Real secrets are injected at runtime via Cloud Run / Secret Manager.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV STRIPE_SECRET_KEY="sk_test_build_placeholder_not_real"
ENV STRIPE_WEBHOOK_SECRET="whsec_build_placeholder_not_real"
ENV NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_build_placeholder_not_real"

RUN npm run build

# Stage 3: Minimal production image
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl curl
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Next.js standalone output — already contains minimal node_modules
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma runtime files needed for DB connection
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Scripts for migration jobs
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=deps    --chown=nextjs:nodejs /app/node_modules/tsx ./node_modules/tsx

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]

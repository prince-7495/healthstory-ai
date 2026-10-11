# HealthStory AI — Railway Deployment Dockerfile
# Uses debian-based Node for Prisma compatibility (alpine lacks libssl 1.1.x)

# ===== Base Stage =====
FROM node:22-slim AS base
WORKDIR /app
ENV NODE_ENV=production

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# ===== Dependencies Stage =====
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

# ===== Build Stage =====
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .

# Generate Prisma client first (uses a dummy URL — only needs the schema)
RUN DATABASE_URL="postgresql://x:x@localhost:5432/x" npx prisma generate

# Build Next.js (real DATABASE_URL injected at runtime, not needed at build)
ARG AUTH_SECRET="build-placeholder"
ENV AUTH_SECRET=$AUTH_SECRET
RUN npm run build

# ===== Production Stage =====
FROM base AS runner
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma client and schema
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

# Set ownership
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
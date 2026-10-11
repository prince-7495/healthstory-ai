# HealthStory AI — Railway Deployment Dockerfile
# Uses multi-stage build for smaller production image

# ===== Base Stage =====
FROM node:22-alpine AS base
WORKDIR /app
ENV NODE_ENV=production

# ===== Dependencies Stage =====
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

# ===== Build Stage =====
FROM base AS builder
COPY package*.json ./
RUN npm ci
COPY . .
# prisma generate only needs the schema, not a real DB connection
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
RUN npm run build

# ===== Production Stage =====
FROM base AS runner
ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma client and schema
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma

# Set ownership
USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
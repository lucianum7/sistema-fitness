FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run db:generate
RUN npm run build

FROM builder AS initializer
CMD ["sh", "-c", "npx prisma migrate deploy && npm run db:prepare-production"]

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Fuso de Brasília para todo cálculo de data/hora (logs do dia, modo fim de semana, etc.).
ENV TZ=America/Sao_Paulo
RUN apk add --no-cache postgresql-client tzdata
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
RUN mkdir -p /app/storage/private /app/backups && chown -R nextjs:nodejs /app/storage /app/backups
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

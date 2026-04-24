# ─── Dev stage (hot reload with next dev) ────────────────────────────────────
FROM node:22-alpine AS dev

WORKDIR /app/dashboard

COPY dashboard/package*.json ./
RUN npm install

# Ensure Tailwind/PostCSS config exists inside the dev image.
# (Without this, `@import "tailwindcss"` is treated as a browser import and
# Tailwind utilities never get generated.)
COPY dashboard/postcss.config.mjs ./postcss.config.mjs
COPY dashboard/tailwind.config.ts ./tailwind.config.ts
COPY dashboard/next.config.ts ./next.config.ts
COPY dashboard/tsconfig.json ./tsconfig.json

# Source is volume-mounted at runtime for hot reload
EXPOSE 8277
ENV NODE_ENV=development
ENV WATCHPACK_POLLING=true

# node_modules is a volume in docker-compose for dev; install at runtime so new deps work
# without requiring users to manually prune volumes.
CMD ["sh", "-lc", "npm install && npm run dev"]

# ─── Builder ──────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app/dashboard

COPY dashboard/package*.json ./
RUN npm install

COPY dashboard/ ./
RUN npm run build

# ─── Production runtime ───────────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app/dashboard

COPY dashboard/package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dashboard/.next ./.next
COPY --from=builder /app/dashboard/public ./public

EXPOSE 8277
ENV NODE_ENV=production

CMD ["npm", "run", "start"]

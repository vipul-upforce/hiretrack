# Base image (Alpine for smaller size)
FROM node:20-alpine AS base

# Install dependencies (including devDependencies for build)
FROM base AS deps
WORKDIR /app
# Install build tools and Python for canvas
RUN apk add --no-cache python3 make g++ pkgconfig pixman-dev cairo-dev pango-dev
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
# Install ALL dependencies (production + dev) for build
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  elif [ -f package-lock.json ]; then npm ci; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Build the app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Increase Node.js memory limit for build
ENV NODE_OPTIONS="--max-old-space-size=4096"
# Build-time placeholders only — pass real values via --build-arg / CI secrets. Never commit secrets.
ARG MONGODB_URI=mongodb://localhost:27017/hiretrack
ARG NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
ARG RECAPTCHA_SECRET_KEY=
ARG ENVIRONMENT=production
ARG BASE_URL=http://localhost:3000
ARG ALLOWED_ORIGINS=localhost
ENV MONGODB_URI=$MONGODB_URI
ENV NEXT_PUBLIC_RECAPTCHA_SITE_KEY=$NEXT_PUBLIC_RECAPTCHA_SITE_KEY
ENV RECAPTCHA_SECRET_KEY=$RECAPTCHA_SECRET_KEY
ENV ENVIRONMENT=$ENVIRONMENT
ENV BASE_URL=$BASE_URL
ENV ALLOWED_ORIGINS=$ALLOWED_ORIGINS
RUN npm run build

# Install production dependencies only
FROM base AS prod-deps
WORKDIR /app
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN apk add --no-cache python3 make g++ pkgconfig pixman-dev cairo-dev pango-dev
# Install only production dependencies
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile --production; \
  elif [ -f package-lock.json ]; then npm ci --only=production; \
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile --prod; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Final production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# Copy production node_modules
COPY --from=prod-deps /app/node_modules ./node_modules
# Copy Next.js build output (for custom server with WebSocket support)
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
# Copy custom WebSocket server
COPY --from=builder /app/server-ws.js ./server-ws.js
# Add non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
# Install PM2 (before switching to non-root user)
RUN npm install -g pm2
# Switch to non-root user
USER appuser
EXPOSE 3000
# Use custom server with WebSocket support
CMD ["pm2-runtime", "node", "server-ws.js"]
# Alternative without PM2: CMD ["node", "server-ws.js"]
# Fallback to original standalone: CMD ["pm2-runtime", "node", "server.js"]
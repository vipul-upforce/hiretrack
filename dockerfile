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
# Define MONGODB_URI for build (use a placeholder; override at runtime)
ENV MONGODB_URI="mongodb://vipul:ZgB%214%5E.%24f446vQp@64.227.170.154:27017/hiretrack-1609?authSource=admin"
ENV NEXT_PUBLIC_RECAPTCHA_SITE_KEY="6Ld4V34rAAAAAAYqBoNUZYx6Xg8JYI3Ozx-ayCne"
ENV RECAPTCHA_SECRET_KEY="6Ld4V34rAAAAADa27B4zf0Bx4BaMMD6AtO-QIRHL"
ENV ENVIRONMENT="production"
ENV BASE_URL="http://localhost:3000"
ENV ALLOWED_ORIGINS="localhost"
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
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# Add non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
# Install PM2 (before switching to non-root user)
RUN npm install -g pm2
# Switch to non-root user
USER appuser
EXPOSE 3000
CMD ["pm2-runtime", "node", "server.js"]
# Alternative: CMD ["node", "server.js"] (if you skip PM2)
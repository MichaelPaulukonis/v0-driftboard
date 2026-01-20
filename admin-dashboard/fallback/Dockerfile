# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* pnpm-lock.yaml* ./

# Install dependencies with --ignore-workspace to avoid monorepo issues
RUN npm install -g pnpm && pnpm install --ignore-workspace

# Copy source code
COPY src src/
COPY tsconfig.json ./

# Build TypeScript
RUN pnpm run build

# Runtime stage
FROM node:18-alpine

WORKDIR /app

# Install pnpm globally
RUN npm install -g pnpm

# Copy package files
COPY package.json package-lock.json* pnpm-lock.yaml* ./

# Install production dependencies only with --ignore-workspace
RUN pnpm install --ignore-workspace --prod

# Copy built application from builder
COPY --from=builder /app/dist dist/
COPY public public/

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)});"

EXPOSE 4000

CMD ["node", "dist/server.js"]

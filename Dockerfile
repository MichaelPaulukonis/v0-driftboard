# Use an official Node.js runtime as a parent image
FROM node:23-alpine AS base

# Install pnpm
RUN npm install -g pnpm

# Set the working directory
WORKDIR /app

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# -- End of base stage --

# ----------------------------------------------------------------------------

# Development stage
FROM base AS dev

# Install all dependencies
RUN pnpm install

# Copy the rest of the application files
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Start the app in development mode
CMD ["pnpm", "dev"]

# -- End of dev stage --

# ----------------------------------------------------------------------------

# Build stage
FROM base AS builder

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application files
COPY . .

# Set NODE_ENV for build optimization
ENV NODE_ENV=production

# Set build-time environment variables (these are needed for Next.js build)
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET

ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY
ENV NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ENV NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID
ENV NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET

# Build the Next.js application
RUN pnpm build

# -- End of builder stage --

# ----------------------------------------------------------------------------

# Production stage
FROM node:23-alpine AS production

# Install pnpm
RUN npm install -g pnpm

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set the working directory
WORKDIR /app

# Copy the built application from the builder stage
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Switch to non-root user
USER nextjs

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the app in production mode
CMD ["node", "server.js"]

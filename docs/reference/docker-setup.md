# Docker Setup for Driftboard

This guide explains how to run Driftboard using Docker for both development and production environments.

## Prerequisites

- Docker and Docker Compose installed on your system
- A Firebase project set up with Authentication and Firestore enabled
- Environment variables configured (see `.env.example`)

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your Firebase configuration values:

```bash
cp .env.example .env.local
```

Update the values in `.env.local` with your actual Firebase project credentials.

## Quick Start

### Production Mode

To run Driftboard in production mode:

```bash
# Build and run the production container
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

The application will be available at `http://localhost:3000`.

## Updating an Existing Deployment

If Driftboard is already running in Docker and you need to deploy the latest code changes:

### Using the Helper Script (Recommended)

```bash
# Pull latest code (if from git)
git pull

# Stop, rebuild, and restart the production container
./docker.sh prod
```

### Using Docker Compose Directly

```bash
# Pull latest code (if from git)
git pull

# Stop existing containers
docker-compose down

# Rebuild and start with latest code
docker-compose up --build -d
```

### Zero-Downtime Update (Advanced)

For production environments where you want to minimize downtime:

```bash
# Build new image first
docker-compose build

# Replace running container (Docker Compose handles the transition)
docker-compose up -d --no-deps --build driftboard
```

**Note**: All methods will preserve your data since Firebase stores all application data externally. The Docker containers are stateless.

### Development Mode

To run Driftboard in development mode with hot reload:

```bash
# Run the development container
docker-compose --profile dev up driftboard-dev --build
```

This will mount your local code into the container and enable hot reloading.

## Docker Commands

### Building the Image

```bash
# Build production image
docker build --target production -t driftboard:latest .

# Build development image
docker build --target dev -t driftboard:dev .
```

### Running Individual Containers

```bash
# Production container
docker run -p 3000:3000 --env-file .env.local driftboard:latest

# Development container with volume mounts
docker run -p 3000:3000 --env-file .env.local \
  -v "$(pwd):/app" \
  -v /app/node_modules \
  -v /app/.next \
  driftboard:dev
```

## Multi-Stage Build Explained

The Dockerfile uses a multi-stage build with the following stages:

1. **base**: Sets up the base Node.js environment and installs pnpm
2. **dev**: Development stage with all dependencies and source code mounting
3. **builder**: Builds the Next.js application for production
4. **production**: Minimal production image with only the built application

## Docker Compose Services

- **driftboard**: Production service with health checks
- **driftboard-dev**: Development service with hot reload (requires `--profile dev`)

## Health Checks

The production container includes a health check that verifies the application is responding on port 3000. You can check the health status with:

```bash
docker-compose ps
```

## Troubleshooting

### Container Won't Start

1. Check that all required environment variables are set in `.env.local`
2. Ensure Firebase credentials are correct
3. Check Docker logs: `docker-compose logs driftboard`

### Build Failures

1. Clear Docker build cache: `docker builder prune`
2. Rebuild without cache: `docker-compose build --no-cache`
3. Check that `pnpm-lock.yaml` is present and up-to-date

### Environment Variables Not Working

1. Verify `.env.local` file exists and has correct values
2. Ensure variables start with `NEXT_PUBLIC_` for client-side access
3. Restart containers after changing environment variables

## Performance Optimization

The production image uses several optimizations:

- **Standalone Output**: Next.js builds a self-contained server
- **Multi-stage Build**: Reduces final image size by excluding build dependencies
- **Non-root User**: Runs as `nextjs` user for security
- **Alpine Linux**: Minimal base image for smaller size

## Security Considerations

- The production container runs as a non-root user (`nextjs`)
- Environment variables are passed securely through Docker Compose
- Firebase credentials should never be committed to version control
- Consider using Docker secrets for sensitive data in production deployments

## Next Steps

For production deployment, consider:

- Using a reverse proxy (nginx, Traefik) for SSL termination
- Setting up container orchestration (Docker Swarm, Kubernetes)
- Implementing backup strategies for your Firebase data
- Setting up monitoring and logging solutions

# Local Development with Docker Compose

This guide explains how to run both the main Driftboard application and the admin dashboard together locally using Docker Compose.

## Quick Start

### Option 1: Run Both Services (Recommended for Full Local Development)

```bash
# Start both driftboard-dev and admin-dashboard
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Then access:

- **Main App**: [http://localhost:3001](http://localhost:3001) (Next.js dev server with hot reload)
- **Admin Dashboard**: [http://localhost:3002](http://localhost:3002) (Express API + UI)

### Option 2: Run Only Main App

```bash
# Just the production driftboard service
docker-compose up driftboard
```

### Option 3: Run Only Admin Dashboard

```bash
# Just the admin dashboard
docker-compose up admin-dashboard
```

### Option 4: Local Native Dev (No Docker)

If you prefer running locally without containers:

```bash
# Terminal 1: Main app
pnpm dev

# Terminal 2: Admin dashboard
cd admin-dashboard/fallback && pnpm dev
```

## Prerequisites

### For Docker Compose

1. **Docker Desktop** installed and running
2. **Environment Variables**: Create `.env.local` at project root with Firebase credentials:

   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
   ```

3. **Firebase Service Account** (for admin dashboard):
   - Download from Firebase Console → Project Settings → Service Accounts → Generate Private Key
   - Save as `secrets/firebase-service-account.json` (git-ignored)

## Service Details

### Driftboard (Main App)

- **Port**: 3001 (local dev) or 3000 (production)
- **Service**: `driftboard-dev` (development with hot reload)
- **Features**: Next.js dev server, source volume mounts, live code reloading
- **Target**: `./Dockerfile` (target: dev)

### Admin Dashboard

- **Port**: 3002 (local dev) or 3001 (production Docker)
- **Service**: `admin-dashboard`
- **Features**: Express server, read-only Firebase access, KPI aggregation, drill-down navigation
- **Target**: `./admin-dashboard/fallback/Dockerfile`

## Port Reference

| Service         | Local Dev Port | Purpose                 |
| --------------- | -------------- | ----------------------- |
| Driftboard      | 3001           | Main application        |
| Admin Dashboard | 3002           | Admin stats & analytics |

## Stopping Services

```bash
# Stop all services (containers keep running)
docker-compose pause

# Resume services
docker-compose unpause

# Stop and remove containers
docker-compose down

# Stop specific service
docker-compose stop admin-dashboard
```

## Logs & Debugging

```bash
# View all logs
docker-compose logs -f

# Follow specific service
docker-compose logs -f admin-dashboard

# View last 50 lines
docker-compose logs --tail=50 driftboard-dev
```

## Production vs Development

- **Production** (`docker-compose.yml`): Uses built images, production environment, no volume mounts
- **Development** (`docker-compose.dev.yml`): Extends prod config with dev profiles, source mounts, and dev environments

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3001 or 3002
lsof -i :3001
lsof -i :3002
kill <PID>
```

### Container Won't Start

```bash
# Check build errors
docker-compose build --no-cache admin-dashboard

# View container logs
docker-compose logs admin-dashboard
```

### Firebase Credentials Issues

- Ensure `secrets/firebase-service-account.json` exists with proper permissions
- Verify `FIREBASE_PROJECT_ID` in `.env.local` matches the service account project
- Service account needs "Viewer" or "Cloud Datastore Viewer" role

## See Also

- [Admin Dashboard README](./admin-dashboard/fallback/README.md)
- [Main App Dev Guide](./README.md)

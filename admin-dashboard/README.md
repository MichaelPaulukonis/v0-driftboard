# Driftboard Admin Dashboard

A lightweight admin dashboard for monitoring Driftboard usage statistics and system health. Built with Metabase running locally via Docker.

## Quick Start

### Prerequisites

- Docker & Docker Compose installed
- Firebase project with Firestore database
- Firebase service account JSON with read-only permissions

### 1. Set Up Environment

```bash
# Copy template and edit with your values
cp .env.template .env

# Edit .env:
# - Set METABASE_ADMIN_PASSWORD (generate: openssl rand -base64 32)
# - Set METABASE_DB_PASSWORD (generate: openssl rand -base64 32)
# - Set FIREBASE_PROJECT_ID
```

### 2. Add Firebase Credentials

```bash
# Download service account from Firebase Console:
# Project Settings > Service Accounts > Generate New Private Key

# Place the JSON file here:
cp ~/Downloads/firebase-service-account.json ./secrets/firebase-service-account.json
```

### 3. Start Metabase

```bash
docker-compose up -d

# Wait for health check (30-60 seconds)
docker-compose logs -f metabase
```

### 4. Access Dashboard

- **URL:** <http://localhost:3001>
- **Username:** admin
- **Password:** Check your `.env` file for `METABASE_ADMIN_PASSWORD`

### 5. Configure Firestore Connector

1. Open <http://localhost:3001>
2. Click **Admin** (gear icon, top right)
3. Go to **Databases** > **New database**
4. Select **Firestore**
5. Fill in:
   - **Database Name:** Driftboard Firestore
   - **Project ID:** Your Firebase project ID
   - **Service Account JSON:** `/run/secrets/firebase-service-account.json`
6. Click **Save** and test the connection

## Configuration

All sensitive values are configured via `.env` (see `.env.template`):

| Variable                   | Description                  | Example                                   |
| -------------------------- | ---------------------------- | ----------------------------------------- |
| `METABASE_ADMIN_PASSWORD`  | Admin login password         | `openssl rand -base64 32`                 |
| `METABASE_DB_PASSWORD`     | PostgreSQL password          | `openssl rand -base64 32`                 |
| `FIREBASE_PROJECT_ID`      | Your Firebase project ID     | `my-driftboard-project`                   |
| `FIREBASE_SERVICE_ACCOUNT` | Path to service account JSON | `./secrets/firebase-service-account.json` |

## Troubleshooting

### Metabase won't start

```bash
# Check if port 3001 is in use
lsof -i :3001

# Or use a different port by editing docker-compose.yml
# ports:
#   - "127.0.0.1:3002:3000"
```

### Firestore connector fails

1. **Verify service account permissions:**
   - Go to Firebase Console > IAM & Admin
   - Service account should have "Firebase Read-Only Viewer" role

2. **Check credentials path:**

   ```bash
   ls -la ./secrets/firebase-service-account.json
   ```

3. **Test JSON validity:**

   ```bash
   cat ./secrets/firebase-service-account.json | jq .
   ```

### Query timeout or slow performance

- Ensure Firestore indexes are created for common queries
- Check Metabase logs: `docker-compose logs metabase`
- Verify network connectivity to Firebase

## Stopping & Cleanup

```bash
# Stop containers
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v
```

## Next Steps (Day 2)

- [ ] Import pre-built dashboards (when available)
- [ ] Configure drill-down views (Users, Boards details)
- [ ] Set up data accuracy validation script
- [ ] Plan migration to custom Remix fallback if Metabase feels limiting

## Fallback Option

If Metabase proves unsuitable (connector issues, performance, auth constraints), we have a custom Remix dashboard scaffold ready to build. See `fallback/` directory when needed.

## Security Notes

- Metabase runs on **localhost:3000 only** — not exposed to external networks
- Firebase credentials are stored in `./secrets/` which is `.gitignored`
- Session timeout is set to 60 minutes; log out when done
- For cloud deployment: plan to use Firebase Auth instead of static admin password

## Documentation

- [PRD](../docs/plans/10.admin-dashboard.md) — Full product requirements
- [Taskmaster Tasks](./.taskmaster/tasks/tasks.json) — Implementation roadmap

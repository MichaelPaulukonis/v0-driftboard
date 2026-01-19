# Driftboard Admin Dashboard (Fallback)

Minimal REST + static UI for admin KPIs, querying Firestore directly via Firebase Admin SDK.

## Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Firebase service account JSON (read-only) at `../secrets/firebase-service-account.json`

## Setup

```bash
cd admin-dashboard/fallback
cp .env.example .env
# edit .env with:
#   PORT=4000 (or another free port)
#   FIREBASE_PROJECT_ID=your-project-id
#   FIREBASE_SERVICE_ACCOUNT=../secrets/firebase-service-account.json

# install deps
pnpm install   # or npm install
```

## Run (dev)

```bash
pnpm dev       # or npm run dev
# visit http://localhost:4000
```

## Build & Run (prod)

```bash
pnpm build
pnpm start
```

## API

- `GET /api/health` → `{ status: 'ok', timestamp }`
- `GET /api/kpi` → `{ users, boards, lists, cards, comments }`

## UI

- Static page at `/` fetching `/api/kpi` and rendering cards
- Manual refresh button; no auto-refresh

## Env Vars

- `PORT` — server port (default 4000)
- `FIREBASE_PROJECT_ID` — your Firebase project ID
- `FIREBASE_SERVICE_ACCOUNT` — path to service account JSON (relative allowed)

## Notes

- Read-only access only; aggregation counts via Firestore `count()`.
- If you change the service account path, update `FIREBASE_SERVICE_ACCOUNT` accordingly.
- For cloud deploy later, move secrets to env vars (no JSON file on disk).

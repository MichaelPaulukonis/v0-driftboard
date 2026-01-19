#!/bin/bash
set -e

echo "🚀 Starting Driftboard Admin Dashboard..."

# Check prerequisites
if ! command -v docker &> /dev/null; then
  echo "❌ Docker is required but not installed"
  exit 1
fi

if ! command -v docker-compose &> /dev/null; then
  echo "❌ Docker Compose is required but not installed"
  exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
  echo "⚠️  .env file not found. Creating from template..."
  cp .env.template .env
  echo "📝 Please edit .env with your credentials and run this script again"
  exit 1
fi

# Check if Firebase credentials exist
if [ ! -f secrets/firebase-service-account.json ]; then
  echo "❌ Firebase service account not found at secrets/firebase-service-account.json"
  echo "   Download from Firebase Console > Project Settings > Service Accounts"
  exit 1
fi

# Start services
echo "🐳 Starting Docker containers..."
docker-compose up -d

# Wait for Metabase to be healthy
echo "⏳ Waiting for Metabase to start (this may take 60 seconds)..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
  if docker-compose exec -T metabase curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Metabase is healthy"
    break
  fi
  attempt=$((attempt + 1))
  sleep 2
done

if [ $attempt -eq $max_attempts ]; then
  echo "⚠️  Metabase took longer than expected to start"
  echo "   Check logs with: docker-compose logs -f metabase"
fi

# Extract admin password from .env
ADMIN_PASSWORD=$(grep '^METABASE_ADMIN_PASSWORD=' .env | cut -d'=' -f2)

echo ""
echo "════════════════════════════════════════════════"
echo "✨ Driftboard Admin Dashboard is running!"
echo "════════════════════════════════════════════════"
echo ""
echo "🌐 Access here: http://localhost:3001"
echo "👤 Username:    admin"
echo "🔐 Password:    $ADMIN_PASSWORD"
echo ""
echo "📖 Next: Configure Firestore connector in Admin panel"
echo "   See README.md for detailed setup instructions"
echo ""

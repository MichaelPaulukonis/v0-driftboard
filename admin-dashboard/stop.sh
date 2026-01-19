#!/bin/bash
set -e

echo "Stopping Driftboard Admin Dashboard..."

docker-compose down

echo "✅ Stopped. Volumes and data preserved."
echo "   To remove all data, run: docker-compose down -v"

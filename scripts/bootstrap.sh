#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Checking prerequisites"
command -v docker >/dev/null 2>&1 || { echo "Error: docker is required"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "Error: docker compose v2 is required"; exit 1; }
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
[ "$NODE_MAJOR" -ge 20 ] || { echo "Error: Node.js >= 20 is required"; exit 1; }

echo "==> Preparing .env"
[ -f .env ] || { cp .env.example .env; echo "    created .env from .env.example"; }

echo "==> Starting PostgreSQL"
docker compose up -d db

echo "==> Waiting for the database"
for i in $(seq 1 60); do
  docker compose exec -T db pg_isready -U logistics -d logistics >/dev/null 2>&1 && { echo "    ready"; break; }
  [ "$i" -eq 60 ] && { echo "Error: database did not become ready"; exit 1; }
  sleep 2
done

echo "==> Installing dependencies"
npm ci

echo "==> Applying migrations"
npx prisma migrate deploy

echo "==> Seeding the validation network"
npx prisma db seed

echo
echo "Done. Start the service with:"
echo "  npm run dev"
echo "  npm run build && node dist/cli/index.js serve"

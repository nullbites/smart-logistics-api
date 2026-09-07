#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

VERSION="$(node -p "require('./package.json').version")"
NAME="smart-logistics-api-${VERSION}"
STAGE="release/${NAME}"

[ -d dist ] || { echo "Error: dist/ not found; run 'npm run build' first"; exit 1; }

rm -rf release "${NAME}.tar.gz"
mkdir -p "${STAGE}/scripts" "${STAGE}/bin"

cp -r dist prisma "${STAGE}/"
cp package.json package-lock.json prisma.config.ts tsconfig.json tsconfig.build.json tsconfig.seed.json docker-compose.yml .env.example README.md "${STAGE}/"
cp bin/smart-logistics.js "${STAGE}/bin/"
cp scripts/bootstrap.sh "${STAGE}/scripts/"

tar -C release -czf "${NAME}.tar.gz" "${NAME}"
echo "${NAME}.tar.gz"

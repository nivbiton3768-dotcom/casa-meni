#!/usr/bin/env bash
set -e

echo "==> Working directory: $(pwd)"
echo "==> Installing from monorepo root..."
cd "$(dirname "$0")/../.."
npm install
echo "==> Installed. Moving to apps/api..."

cd apps/api
echo "==> In $(pwd)"

echo "==> Generating Prisma client..."
npx prisma generate

echo "==> Compiling TypeScript..."
npx tsc -p tsconfig.build.json --noEmit false 2>&1 || true
echo "==> tsc exit code: $?"

echo "==> Checking dist output..."
ls -la dist/ 2>&1 || echo "dist/ does not exist!"

if [ ! -f dist/main.js ]; then
  echo "==> dist/main.js missing, trying nest build..."
  npx nest build
  ls -la dist/ 2>&1 || echo "dist/ still missing after nest build!"
fi

echo "==> Final check:"
ls -la dist/main.js
echo "==> Build done"

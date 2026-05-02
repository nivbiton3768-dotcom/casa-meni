#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/../.."

npm install

cd apps/api

npx prisma generate
npx tsc -p tsconfig.build.json

echo "Build complete. dist/main.js:"
ls -la dist/main.js

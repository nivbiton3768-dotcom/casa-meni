#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/../.."
npm install
cd apps/api

npx prisma generate
npx tsc -p tsconfig.build.json --noEmit false

# tsc outputs to dist/src/ because prisma.config.ts is at root level
# symlink so `node dist/main` works
if [ -f dist/src/main.js ] && [ ! -f dist/main.js ]; then
  cp -r dist/src/* dist/
fi

ls dist/main.js
echo "Build OK"

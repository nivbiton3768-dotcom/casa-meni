#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/../.."
npm install
cd apps/api

npx prisma generate
npx tsc -p tsconfig.build.json

ls dist/main.js
echo "Build OK"

#!/usr/bin/env bash
# Build wisp-wallet.mcpb (a zip: manifest.json + server/{index.js,node_modules}).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$ROOT/.mcpb-build"
OUT="$ROOT/wisp-wallet.mcpb"

rm -rf "$BUILD" "$OUT"
mkdir -p "$BUILD/server"

cd "$ROOT"
npm run build
cp "$ROOT/dist/index.js" "$BUILD/server/index.js"
sed -i.bak '1{/^#!/d;}' "$BUILD/server/index.js" && rm -f "$BUILD/server/index.js.bak"

cp "$ROOT/package.json" "$BUILD/server/package.json"
cd "$BUILD/server"
npm install --omit=dev --ignore-scripts --legacy-peer-deps
rm -f package.json package-lock.json

find node_modules -type f -name '*.map' -delete 2>/dev/null || true
find node_modules -type d \( -name '__tests__' -o -name 'tests' -o -name 'docs' -o -name 'examples' \) -prune -exec rm -rf {} + 2>/dev/null || true
rm -rf node_modules/typescript 2>/dev/null || true

cd "$BUILD"
cp "$ROOT/manifest.json" manifest.json
zip -rq "$OUT" . -x '*.DS_Store'

cd "$ROOT"
rm -rf "$BUILD"
echo "Built $OUT"

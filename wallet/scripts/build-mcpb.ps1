# Build wisp-wallet.mcpb (a zip: manifest.json + server/{index.js,node_modules}) on Windows.
$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $PSScriptRoot
$BUILD = Join-Path $ROOT ".mcpb-build"
$OUT = Join-Path $ROOT "wisp-wallet.mcpb"

if (Test-Path $BUILD) { Remove-Item -Recurse -Force $BUILD }
if (Test-Path $OUT) { Remove-Item -Force $OUT }
New-Item -ItemType Directory -Path "$BUILD/server" -Force | Out-Null

Set-Location $ROOT
& npm.cmd run build

$idx = Get-Content "$ROOT/dist/index.js" -Raw
$idx = $idx -replace '^#!/usr/bin/env node\r?\n?', ''
Set-Content "$BUILD/server/index.js" -Value $idx -NoNewline -Encoding utf8

Copy-Item "$ROOT/package.json" "$BUILD/server/package.json"
Set-Location "$BUILD/server"
& npm.cmd install --omit=dev --ignore-scripts --legacy-peer-deps
Remove-Item "package.json","package-lock.json" -ErrorAction SilentlyContinue

# Prune to shrink the archive
Remove-Item "node_modules/typescript" -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path "node_modules" -Recurse -Include "*.map" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path "node_modules" -Recurse -Directory -Include "__tests__","tests","docs","examples" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

Set-Location $BUILD
Copy-Item "$ROOT/manifest.json" "manifest.json"
$tmp = Join-Path $ROOT "wisp-wallet.zip"
Compress-Archive -Path "$BUILD/*" -DestinationPath $tmp -Force
Move-Item $tmp $OUT -Force

Set-Location $ROOT
Start-Sleep -Milliseconds 300
Remove-Item -Recurse -Force $BUILD -ErrorAction SilentlyContinue
Write-Host "Built $OUT"

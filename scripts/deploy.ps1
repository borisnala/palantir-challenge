# Deploy Risk Desk only, from the owner's PC. Run from the palantir-challenge folder:
#   powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1
# The build is packed into the router Worker, bound only to lab.borisnala.com/risktool-prototype*, so the rest of the
# lab is never touched.
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

git pull --ff-only
npm ci
$env:BASE_PATH = "/risktool-prototype"
npm run build
Remove-Item Env:BASE_PATH

node scripts/pack-worker.mjs
Push-Location router; npx wrangler deploy; Pop-Location
Write-Host "Live at https://lab.borisnala.com/risktool-prototype/"

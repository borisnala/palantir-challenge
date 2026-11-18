# Deploy Risk Desk only, from the owner's PC. Run from the palantir-challenge folder:
#   powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1
# It goes to the risk-desk Pages project. The lab's _worker.js serves https://lab.borisnala.com/risktool-prototype/
# from there, so the rest of the lab is never touched.
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

git pull --ff-only
npm ci
$env:BASE_PATH = "/risktool-prototype"
npm run build
Remove-Item Env:BASE_PATH

$stage = Join-Path $env:TEMP ("riskdesk-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory $stage | Out-Null
Copy-Item "out" "$stage\risktool-prototype" -Recurse
Set-Content "$stage\_redirects" "/ /risktool-prototype/ 302"
Set-Content "$stage\_headers" "/*`n  X-Robots-Tag: noindex, nofollow"

npx wrangler pages deploy "$stage" --project-name risk-desk --branch main --commit-dirty=true
Remove-Item $stage -Recurse -Force
Write-Host "Live at https://lab.borisnala.com/risktool-prototype/"

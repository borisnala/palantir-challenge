# Deploy the whole lab from the owner's PC, with Risk Desk at https://lab.borisnala.com/risktool-prototype/
# Run from the palantir-challenge folder:
#   powershell -ExecutionPolicy Bypass -File scripts\deploy.ps1 -IntelliTrade "C:\path\IntelliTrade.html" -Sense50 "C:\path\Sense50.html"
# The two prototype files exist only on this PC. A Pages deploy replaces the whole lab, so they go in every time.
param(
  [Parameter(Mandatory = $true)][string]$IntelliTrade,
  [Parameter(Mandatory = $true)][string]$Sense50
)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
foreach ($f in @($IntelliTrade, $Sense50)) { if (-not (Test-Path $f)) { throw "File not found: $f" } }

# 1. Risk Desk, latest code, built for its subfolder
git pull --ff-only
npm ci
$env:BASE_PATH = "/risktool-prototype"
npm run build
Remove-Item Env:BASE_PATH

# 2. The lab sources (hub, headers, robots, desktop demo) from the lab branch
$stage = Join-Path $env:TEMP ("lab-" + [guid]::NewGuid().ToString("N"))
git clone -q --depth 1 --filter=blob:none --sparse -b claude/practical-mccarthy-gz7fsk https://github.com/borisnala/autoply "$stage\src"
git -C "$stage\src" sparse-checkout set profiles/boris/lab
Copy-Item "$stage\src\profiles\boris\lab" "$stage\site" -Recurse

# 3. The real prototypes, Risk Desk, no internal notes
Copy-Item $IntelliTrade "$stage\site\intellitrade-prototype\index.html" -Force
Copy-Item $Sense50 "$stage\site\sense50-prototype\index.html" -Force
Remove-Item "$stage\site\risktool-prototype" -Recurse -Force
Copy-Item "out" "$stage\site\risktool-prototype" -Recurse
Get-ChildItem "$stage\site" -Recurse -Depth 1 -Include README.md, README.txt | Remove-Item -Force

# 4. Deploy the whole lab
npx wrangler pages deploy "$stage\site" --project-name borisnala-lab --branch lab --commit-dirty=true
Remove-Item $stage -Recurse -Force
Write-Host "Live at https://lab.borisnala.com/risktool-prototype/"

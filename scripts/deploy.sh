#!/usr/bin/env bash
# "deploy" (owner 2026-11-18): ship Risk Desk only. It has its own Pages project, risk-desk, and the lab's _worker.js
# serves https://lab.borisnala.com/risktool-prototype/ from it, so this never touches the rest of the lab.
#   bash scripts/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."
PROJECT="${PAGES_PROJECT:-risk-desk}"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

rm -rf .next out
BASE_PATH=/risktool-prototype npm run check
bash scripts/map.sh
git push -u origin "$(git branch --show-current)"

# The app sits under /risktool-prototype/, exactly the path the lab forwards
cp -r out "$STAGE/risktool-prototype"
printf '/ /risktool-prototype/ 302\n' > "$STAGE/_redirects"
printf '/*\n  X-Robots-Tag: noindex, nofollow\n' > "$STAGE/_headers"

export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-proxy-injected}"
if [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  CLOUDFLARE_ACCOUNT_ID=$(curl -sS https://api.cloudflare.com/client/v4/accounts | python3 -c "import sys,json; r=json.load(sys.stdin); print(r['result'][0]['id'] if r.get('success') and r.get('result') else '')")
  [ -n "$CLOUDFLARE_ACCOUNT_ID" ] || { echo "Cloudflare refused the token. Check the network secret for api.cloudflare.com."; exit 1; }
  export CLOUDFLARE_ACCOUNT_ID
fi
npx --yes wrangler@4 pages deploy "$STAGE" --project-name "$PROJECT" --branch main --commit-dirty=true
echo "Live at https://lab.borisnala.com/risktool-prototype/"

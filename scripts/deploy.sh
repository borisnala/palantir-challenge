#!/usr/bin/env bash
# "deploy" (owner 2026-11-18): ship Risk Desk only, from the cloud session, to https://lab.borisnala.com/risktool-prototype/
#   bash scripts/deploy.sh
# The build is packed into the router Worker (router/), bound only to lab.borisnala.com/risktool-prototype*, so the
# rest of the lab is never touched. A Pages upload is not used: the cloud session's network swaps the upload's own
# pass for the API token, so Pages uploads fail here while a Worker upload works.
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf .next out
BASE_PATH=/risktool-prototype npm run check
bash scripts/map.sh
git push -u origin "$(git branch --show-current)"
node scripts/pack-worker.mjs

export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-proxy-injected}"
if [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  CLOUDFLARE_ACCOUNT_ID=$(curl -sS https://api.cloudflare.com/client/v4/accounts | python3 -c "import sys,json; r=json.load(sys.stdin); print(r['result'][0]['id'] if r.get('success') and r.get('result') else '')")
  [ -n "$CLOUDFLARE_ACCOUNT_ID" ] || { echo "Cloudflare refused the token. Check the network secret for api.cloudflare.com."; exit 1; }
  export CLOUDFLARE_ACCOUNT_ID
fi
(cd router && npx --yes wrangler@4 deploy)
echo "Live at https://lab.borisnala.com/risktool-prototype/"

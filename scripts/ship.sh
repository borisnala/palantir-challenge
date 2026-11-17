#!/usr/bin/env bash
# "push" (owner 2026-11-17): check, commit is done by the caller, push to GitHub, deploy to Cloudflare Pages.
#   bash scripts/ship.sh            push main and deploy out/ to the Pages project
# The Cloudflare token is a network secret of the cloud environment: the proxy adds it to requests to
# api.cloudflare.com, so CLOUDFLARE_API_TOKEN only holds a placeholder here. On a PC, set the real token instead.
set -euo pipefail
cd "$(dirname "$0")/.."
PROJECT="${PAGES_PROJECT:-risk-desk}"

rm -rf .next out
npm run check
bash scripts/map.sh

git push -u origin "$(git branch --show-current)"

export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-proxy-injected}"
if [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  CLOUDFLARE_ACCOUNT_ID=$(curl -sS https://api.cloudflare.com/client/v4/accounts | python3 -c "import sys,json; r=json.load(sys.stdin); print(r['result'][0]['id'] if r.get('success') and r.get('result') else '')")
  [ -n "$CLOUDFLARE_ACCOUNT_ID" ] || { echo "Cloudflare refused the token. Check the network secret for api.cloudflare.com."; exit 1; }
  export CLOUDFLARE_ACCOUNT_ID
fi

if ! npx --yes wrangler@4 pages project list 2>/dev/null | grep -q "\b$PROJECT\b"; then
  npx --yes wrangler@4 pages project create "$PROJECT" --production-branch main
fi
npx --yes wrangler@4 pages deploy out --project-name "$PROJECT" --branch main --commit-dirty=true

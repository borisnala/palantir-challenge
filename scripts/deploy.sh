#!/usr/bin/env bash
# "deploy" (owner 2026-11-18): Risk Desk goes live at https://lab.borisnala.com/risktool-prototype/
#   bash scripts/deploy.sh
# A Cloudflare Pages deploy replaces the whole lab site, so this builds the whole lab: the hub and the other
# prototypes from the lab sources (autoply branch, profiles/boris/lab), Risk Desk built into risktool-prototype/.
# It refuses while IntelliTrade or Sense50 are still "Coming soon" placeholders, because deploying those would replace
# the owner's real prototypes on the live site. LAB_DIR=/path/to/lab uses a local lab folder instead of the branch.
set -euo pipefail
cd "$(dirname "$0")/.."
PROJECT="${LAB_PROJECT:-borisnala-lab}"
LAB_REPO="https://github.com/borisnala/autoply"
LAB_BRANCH="claude/practical-mccarthy-gz7fsk"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

# 1. Risk Desk, built for its subfolder, checked, pushed
rm -rf .next out
BASE_PATH=/risktool-prototype npm run check
bash scripts/map.sh
git push -u origin "$(git branch --show-current)"

# 2. The rest of the lab
mkdir -p "$STAGE/site"
if [ -n "${LAB_DIR:-}" ]; then
  cp -r "$LAB_DIR/." "$STAGE/site/"
else
  git clone -q --depth 1 --filter=blob:none --sparse -b "$LAB_BRANCH" "$LAB_REPO" "$STAGE/src"
  git -C "$STAGE/src" sparse-checkout set profiles/boris/lab
  cp -r "$STAGE/src/profiles/boris/lab/." "$STAGE/site/"
fi
for p in intellitrade-prototype sense50-prototype; do
  if grep -qi "coming soon" "$STAGE/site/$p/index.html" 2>/dev/null && [ "${ALLOW_PLACEHOLDERS:-}" != "1" ]; then
    echo "Stopped: $p is still a placeholder in the lab sources. Deploying would replace the real one on the live site."
    echo "Put the real file there first (or deploy from the PC with scripts/deploy.ps1)."
    exit 1
  fi
done

# 3. Risk Desk into its folder, internal notes out of the public site
rm -rf "$STAGE/site/risktool-prototype"
cp -r out "$STAGE/site/risktool-prototype"
find "$STAGE/site" -maxdepth 2 \( -name "README.md" -o -name "README.txt" \) -delete

# 4. Deploy the whole lab
export CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN:-proxy-injected}"
if [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  CLOUDFLARE_ACCOUNT_ID=$(curl -sS https://api.cloudflare.com/client/v4/accounts | python3 -c "import sys,json; r=json.load(sys.stdin); print(r['result'][0]['id'] if r.get('success') and r.get('result') else '')")
  [ -n "$CLOUDFLARE_ACCOUNT_ID" ] || { echo "Cloudflare refused the token. Check the network secret for api.cloudflare.com."; exit 1; }
  export CLOUDFLARE_ACCOUNT_ID
fi
npx --yes wrangler@4 pages deploy "$STAGE/site" --project-name "$PROJECT" --branch lab --commit-dirty=true
echo "Live at https://lab.borisnala.com/risktool-prototype/"

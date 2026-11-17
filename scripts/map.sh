#!/usr/bin/env bash
# Build the graphify code map (graphify-out/). About two seconds, no model, same result for the same code.
# Runs at session start (.claude/settings.json) and after code edits. Never fails a session.
#   bash scripts/map.sh            build or refresh the map
# Then, instead of reading files to find something:
#   graphify explain "<Component or function>"   where it is, who calls it, what it calls
#   graphify query "<words>" --depth 1           when no name is known yet
#   graphify affected "<function>"               what a change to it reaches
cd "$(dirname "$0")/.." || exit 0
if ! command -v graphify >/dev/null 2>&1 && ! python3 -c "import graphify" 2>/dev/null; then
  python3 -m pip install -q --disable-pip-version-check graphifyy==0.9.106 >/dev/null 2>&1 || { echo "graphify not installed, map skipped"; exit 0; }
fi
if command -v graphify >/dev/null 2>&1; then G=graphify; else G="python3 -m graphify"; fi
$G update . >/dev/null 2>&1 && echo "Code map ready. Before reading code: graphify explain \"<name>\" or graphify query \"<words>\" --depth 1" || echo "graphify update failed, map skipped"
exit 0

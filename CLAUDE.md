# Risk Desk: instructions for Claude

Risk Desk is the Global Risk Portal rebuilt for a phone. The owner built the portal alone; this app is his entry for the
Palantir design challenge (Lens B, make it click). Dummy data only: logins 99000001.., names "Demo Client N", groups
under `DUMMY\`. Never add real logins, group names, client names or values. The portal's Algo Config page is
confidential and stays out of this app entirely.

## Code map (graphify), read this before any code question
The map is built by `scripts/map.sh` at session start (about two seconds) and is never committed.
- Before the first search or file read: `graphify explain "<Component>"` (where it is, who calls it, what it calls).
  No name yet: `graphify query "<words>" --depth 1`. Before changing a shared component: `graphify affected "<name>"`.
  Then read only the lines those name.
- After editing code: `bash scripts/map.sh`.
- Put these rules in the prompt of every subagent that reads code.

## Where things are
- `src/lib/data.ts`: all dummy data and the number formatters. One file, so the demo tells one story.
- `src/components/app-state.tsx`: in-memory state (approve or reject, read alerts, watchlist). Nothing is saved.
- `src/components/tab-bar.tsx`, `src/components/ui.tsx`: the glass tab bar and small shared parts.
- `src/app/`: one folder per screen. Today, Approvals, Clients (list and `[login]` profile), Alerts.
- `src/app/globals.css`: the whole look, from the owner's Autoply phone app (iOS large titles, light mode, glass bar).

## Commands
- `npm run dev`: local server. `npm run check`: lint, typecheck and build. Run it before every commit.
- `npm run build` writes `out/`, plain static files. Deploy:
  `npx wrangler pages deploy out --project-name borisnala-lab --branch lab` (or Cloudflare Pages connected to this repo,
  build command `npm run build`, output folder `out`).
- Check the screens at phone width (390 px) with Playwright before saying a change is done.

## Writing rules (owner)
Every word on screen: no colons, no semicolons, no em dashes. Short sentences and commas. Plain words a risk manager
uses. Numbers with units.

## Website cloner
This project started from JCodesMore/ai-website-cloner-template (MIT, see LICENSE). Its `/clone-website` command and
notes are in AGENTS.md. Use it to study a site's layout for inspiration, then design our own screens. Never ship another
company's logo, text, images or a copy of their pages.

@AGENTS.md

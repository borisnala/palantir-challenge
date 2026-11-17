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
- `source/payloads/*.json.gz`: the desktop portal demo's own dummy payloads. `python3 scripts/distill.py` turns them
  into `src/data/*.json`, one small file per screen. Never hand-write numbers, change the converter instead.
- `src/lib/data.ts`: clients, alerts and the formatters. `src/lib/levels.ts`: traffic light labels.
- Navigation (owner 2026-11-18): the side menu (src/components/shell.tsx) holds Today, Risk, Liquidity, Withdrawals,
  Clients, Alerts and Recents; the account (Users, Device access, Build paths) sits at its bottom. The bell is top right. Every portal page has a
  screen: Risk holds the risk pages, CRA and Promotion; Liquidity holds CLTL, PG Markups, Manual Level, Group Spread,
  Book View. CandleTL Control and Algo Config are confidential and stay out.
- Rule (owner 2026-11-18, "never hyperlink some feature or display anything from some buttons"): every button does its
  real job inside the app. A client row links only when that client has a profile. Settings changes go through a
  Confirm sheet that lists each change. The crawl in the verification step must report no dead link and no empty tap.
- Nothing at the bottom moves or shrinks on scroll (owner 2026-11-18).
- `src/components/app-state.tsx`: in-memory state (decisions, reads, watchlist, control edits, toast). Nothing is saved.
- `src/components/ios.tsx`: the iOS building blocks. NavBar (collapsing large title), Group and Row (inset grouped
  lists), Sheet, Switch, Segmented. Build every screen from these, never from ad hoc cards.
- `src/components/shell.tsx`: side menu and search circle. `src/components/ui.tsx`: sparkline, change pill, bars,
  monogram.
- `src/app/`: one folder per screen. Today, Approvals, Clients (list and `[login]` profile), Alerts.
- `src/app/globals.css`: the whole look. Apple system colors, the SF type ramp, light and dark.

## Gold standard (owner 2026-11-18): the Claude iOS app
Layout follows the Claude app on iPhone: warm off-white (#f8f7f4) and soft black, a top bar of round glass buttons with
the title in a glass capsule and a second line under it, a side menu (sections, then Recents, account at the bottom)
instead of a tab bar, a search circle bottom left and the screen's main action as a black pill bottom right
(NavBar `trailing`), sentence-case gray section labels, white cards with 24 px radii, outline icons (no colored
tiles), sheets with the X on the left, step lists drawn as a timeline (Group className="timeline"). Take the
patterns, never Claude's logo, wordmark or brand colors.

## Design rule (owner 2026-11-17: "not apple enough, be mindful of that", then "today's Apple, liquid glass, liquid physics")
Every screen must read as a native iOS 26 app with Liquid Glass. Glass is for the control layer only (tab bar, bar
buttons, sheet, search, segmented), content stays solid. Anything that moves runs on springs (`src/components/liquid.tsx`:
Spring, useSpringLoop, stretch, Glass, LightSource). Chromium bends the backdrop through each Glass element's own SVG
lens; Safari falls back to blur, rim and sheen, so check both looks. Use Apple's own patterns: large titles that collapse, inset grouped
lists, sheets, segmented controls, switches, system colors, 44 pt touch targets. When unsure, copy how Health,
Stocks, Mail or Contacts solve it. Check light and dark mode at 393 px before calling a change done.

## Commands
- `npm run dev`: local server. `npm run check`: lint, typecheck and build. Run it before every commit.
- CSS change not showing in the build? Turbopack kept a stale stylesheet once (2026-11-17). `rm -rf .next out`, then build.
- `npm run build` writes `out/`, plain static files.

## "push" means ship (owner 2026-11-17)
When the owner says "push": commit the work, then run `bash scripts/ship.sh`. It cleans the build cache, runs the
checks, refreshes the code map, pushes to GitHub and deploys `out/` with wrangler to the Cloudflare Pages project
`risk-desk` (risk-desk.pages.dev). Report the deploy URL wrangler prints. Do not deploy without being told "push".
Never deploy to the `borisnala-lab` project from here: a Pages deploy replaces the whole site, and the lab's
IntelliTrade and Sense50 prototypes exist only on the owner's PC.
The Cloudflare token is a network secret of the cloud environment (host api.cloudflare.com); never put it in a file.

## Backgrounds (owner 2026-11-17)
No gradient or ambient color backgrounds. Plain system background only. The glass takes its color from the content
that scrolls under it.
- Check the screens at phone width (390 px) with Playwright before saying a change is done.

## Writing rules (owner)
Every word on screen: no colons, no semicolons, no em dashes. Short sentences and commas. Plain words a risk manager
uses. Numbers with units.

## Website cloner
This project started from JCodesMore/ai-website-cloner-template (MIT, see LICENSE). Its `/clone-website` command and
notes are in AGENTS.md. Use it to study a site's layout for inspiration, then design our own screens. Never ship another
company's logo, text, images or a copy of their pages.

@AGENTS.md

# Risk Tool: instructions for Claude

Risk Tool (named by the owner 2026-11-18, earlier "Risk Desk") is the Global Risk Portal rebuilt for a phone. The owner built the portal alone; this app is his entry for the
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
  into `src/data/*.json`, one small file per screen. Never hand-write numbers, change the converter instead. Its tidy()
  strips colons, semicolons, em dashes and ASCII arrows from portal text. Portal codes go through sentence() on screen.
- `src/lib/data.ts`: clients, alerts and the formatters. `src/lib/levels.ts`: traffic light labels.
- Navigation (owner 2026-11-18): the side menu (src/components/shell.tsx) holds Today, Risk, Liquidity, Withdrawals,
  Clients and Recents (client profiles and analysis screens only, with a second line; the watchlist stands in while it is empty); the account (Users, Device access, Build paths) sits at its bottom. The bell is top right. Every portal page has a
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
- Client 360 (owner 2026-11-18, "everything in one page is confusing", "variant data", "more playful", "y axis",
  "make the equity move"): src/components/c360.tsx, four tabs. Overview (live equity that ticks each second for a client
  with open positions, the verdict, the P&L chart with a y axis and a finger scrub), Trading (month grid of trading
  days, sessions, symbols, holding time), Risk (score ring, reasons, detections, evidence, findings, group history),
  Account (money, profit windows, open positions, reconciliation, withdrawals, note, alerts). Header actions are Status,
  Note and Move group (a Confirm sheet, recorded in the group history), never Watch, Alerts or Copy login. Data:
  distill.py builds client360.json, 99000001 from the portal's own payload, every other client a seeded variant
  shaped to that client's own figures (P&L windows, win rate, lots, open book, group moves, ETL). Odd logins trade live,
  even logins are flat. The P&L chart has Realized P&L or Portfolio growth, Linear or Log, Groups bands, compare price
  and net lots bars, like the desktop panel. Trading holds the trading pattern on TradingView Lightweight Charts 5.2.1
  (pattern.tsx): simulated daily candles with the client's own buys and sells as arrows.
- Morning Digest (owner 2026-11-19, "columns won't scale to hundreds"): the profit change, one stacked bar of movement
  counts, the kinds as filter chips with counts, and a dense table of the largest moves (8 here, the rest in a sheet
  with a search field). Never columns of cards.
- `src/app/`: one folder per screen. Today, Approvals, Clients (list and `[login]` profile), Alerts.
- `src/app/globals.css`: the whole look. Apple system colors, the SF type ramp, light and dark.

## Gold standard (owner 2026-11-18): the Claude iOS app
Layout follows the Claude app on iPhone: warm off-white (#f8f7f4) and soft black, a top bar of round glass buttons with
the title in a glass capsule and a second line under it, a side menu (sections, then Recents, account at the bottom)
instead of a tab bar, the glass search capsule at the bottom with the screen's main action beside it
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

## "deploy" means ship Risk Desk only (owner 2026-11-18)
Risk Desk lives at https://lab.borisnala.com/risktool-prototype/. When the owner says "deploy" (or "push"): commit,
then `bash scripts/deploy.sh`, from this cloud session. It builds with BASE_PATH=/risktool-prototype, runs the checks,
refreshes the map, pushes to GitHub, packs `out/` into `router/site.js` (scripts/pack-worker.mjs) and deploys the
`risktool-router` Worker, bound only to `lab.borisnala.com/risktool-prototype*`. The rest of the lab is never touched.
Do not use a Pages deploy from here: the session's network swaps Pages' own upload pass for the API token and the
upload fails (Authorization failed, code 8000013). Never deploy the `borisnala-lab` project from here either.
The Cloudflare token is a network secret of the cloud environment (host api.cloudflare.com); never put it in a file.
The Next.js links already carry the base path, so never write a raw `<a href="/...">` or `window.location`.

## Backgrounds (owner 2026-11-17)
No gradient or ambient color backgrounds. Plain system background only. The glass takes its color from the content
that scrolls under it.
- Check the screens at phone width (390 px) with Playwright before saying a change is done.

## Writing rules (owner)
Every word on screen: no colons, no semicolons, no em dashes. Short sentences and commas. Numbers with units.
Register (owner 2026-11-18, "this is professional risk tooling"): formal desk language, never chatty. "Action required",
"Pending review", "Reasons", "Revert decision", "Demonstration data", never "Needs you", "to decide", "Why", "Undo my".

## Brand, haptics, motion (owner 2026-11-18)
- Logo (owner 2026-11-18, "pro, the way Bloomberg would do it"): one mark, drawn as shapes on a 100 grid in
  src/components/brand.tsx, never typed in a font: a geometric r with a raised plus whose bars match its weight. Black
  on white for the favicon (src/app/icon.svg) and the Home Screen icon (apple-icon.png, rendered from the same SVG).
  The wordmark is "risk tool" heavy, tight and black, with the drawn plus raised top right (the Luma placement).
- Layout values (globals.css :root, owner 2026-11-18 "nothing overlaps"): --sat/--sab are the iPhone's top and bottom
  safe areas. The top bar sits at --bar-top (safe area - 10, but never above 46 on a notch or island phone: right under the island as the Claude app, clear of the clock on a notch), is --bar-h 52 tall and ends at --bar-bottom; content
  starts 14 px under it. The search circle and the action pill sit --dock-gap 14 above the bottom safe area and are
  --dock-h 60 tall; every page ends with that height + 24 of padding, so the last row always clears them. Pages use
  the full width on a phone (16 px sides), 430 px on desktop. Never write env(safe-area-*) anywhere else.
- Pull to refresh moves only the content (--pull on main), never the bar; the spinner sits under --bar-bottom.
- The open menu locks the page: main is inert, the page can not scroll (html.menu-open).
- The ⋯ menu (owner 2026-11-19, "tailored, what the user needs most"): each screen registers its own items with
  usePageMenu (ios.tsx). Client 360 offers Copy login, Copy group path, Copy risk summary, Move group. Notifications
  offers Show unread only, Copy logins in view, Alert settings. Refresh data and Settings always close the list. No
  Share or Copy link.
- Pickers are iOS pull-down menus (PullDown in ios.tsx), never a native select list.
- Notifications are laid out as iOS Mail: the unread dot in the margin by the first line, a small severity glyph before
  the title, time and chevron on the first line, client on the second, detail under it.
- Move group (owner 2026-11-19) needs a target group shown with its full path and a reason (REASONS in c360.tsx, plus
  optional evidence). The Confirm lists both paths and the reason, and the group history records reason and user.
- No light follows the pointer or the finger anywhere: rims and sheen are lit from a fixed point (owner 2026-11-19).
- Haptics map: light tick when a choice changes (switch, segmented, stepper, page change, ⋯ menu, menu open or close)
  and when a drag passes its point (menu open or close, sheet dismiss, pull past refresh); firm double tick when an
  action completes (every confirmation toast). Never before the person has touched the page.
- Liquid Glass (owner 2026-11-19, from his Outlook recording; physics, numbers and the per-control map in
  docs/LIQUID_GLASS.md, read it before touching glass): pressed glass swells to 1.12 and lightens evenly, no spotlight
  under the finger (owner 2026-11-19, "no light in the button, natural Apple"). The segmented thumb lifts into a clear lens on touch, magnifies the labels,
  fringes red and blue at its rim, follows the finger, rubber-bands past the ends and sinks back on release, built from
  the page so Safari shows it too. The more menu grows out of its button. Reduce Transparency turns glass solid.
- Live account (owner 2026-11-19, "how would a correct financier visualise floating"): equity, balance, floating and
  margin level, floating P&L over two minutes autoscaled with a last-value tag, and each position with open and
  current price. P&L comes from price, (price - open) x lots x contract size, with prices from distill.py PRICE.
- Settings (owner 2026-11-19, the Claude app's Settings sheet; src/components/settings.tsx): opened from the menu
  avatar, the more menu and Account. Account card with Switch user, then Account (Profile, Clearance level, Activity,
  Notifications, Users and roles, Device access, Build paths), App (Start screen, Point of view, Live prices, Haptic
  feedback), Appearance tiles, Sign out, and an i menu (build, data source, licenses). Every row works.
  Clearance: the portal roles viewer, editor, admin (app-state ROLE_CAN). Confirm checks `need` (default editor), and
  direct actions call guard(): withdrawals, statuses, notes, watchlist and group moves need editor; users and devices
  need admin. Preferences live in the browser (risktool-prefs). Light or Dark is forced through data-theme:
  scripts/postcss-theme.cjs copies every prefers-color-scheme dark block for it, so write dark styles as usual.
- Loading outlines (owner 2026-11-19, "as we did it in Autoply"): motion.tsx ghost(ms) turns the screen into its own
  shimmering outline while data refreshes (pull to refresh, Refresh data). Not on plain page changes. Each outline
  block is clipped to the measured box of its own line of text, so padding and spacing around it stay empty.
- Segmented controls capture the pointer only once a drag starts: capturing on touch-down sent taps to the track and
  stopped plain taps from switching segments (2026-11-19).
- Device fit (owner 2026-11-19, src/lib/device.ts, inline before first paint): a table of every iPhone viewport sets
  --sat --sab --sal --sar, --bar-top, --dpr and --hair (one device pixel) where iOS reports no insets. No zoom at all
  (viewport, gesture and double-tap blocked, inputs 16 px). Portrait only: landscape shows the rotate notice.
- Bottom search bar (owner 2026-11-19, "no floating icon" then "that ain't the Apple way"): shell.tsx CommandBar, as iOS
  26 Mail, Notes and Safari: a full-width glass search capsule 8 px above the home indicator, the screen's action
  (NavBar `trailing`, portalled in) as a black capsule beside it, content fading out under them. No solid bar, no GO
  key, no small floating circle. Inactive while data refreshes (html.refreshing).
- Loading (owner 2026-11-19, "lazy loading only if it needs time"): screens with data in the page draw at once. Each
  Client 360 profile is its own file (src/data/c360/<login>.json) fetched on open behind its own outline, the trading
  chart shows its outline until the chart library loads, refresh shows the outline while it waits.
- Motion: page changes move only the content under the glass bar (never the bar), 0.26 to 0.28 s; presses 0.25 s in,
  0.5 s out; menus 0.45 s.
- Launch (as the Autoply app): the plus shows from the first frame and breathes, then gathers and bursts open into the
  app through a plus-shaped window, once per load only (brand.tsx Launch, motion.tsx LaunchReady). No glow, no
  gradients.
- Behaviour from the owner's Claude app recording: the side menu sits under the page and opening it pushes the page
  right as a dimmed rounded card (edge swipe from the left opens, swipe left or tap the page closes). The title capsule
  opens a Data status sheet, the round ⋯ button opens a glass menu (Share, Copy link, Refresh data, Account). Rows in a
  sheet push a detail page inside it with a back button (useSheetPush). Never put will-change on .stage: it would
  pin every sheet to the bottom of the page instead of the screen.
- Haptics (src/lib/haptics.ts, as the Autoply app): a light tick when a choice changes (switch, segmented, stepper, page
  change, menu open), a firm double tick when an action completes (every confirmation toast, pull to refresh).
- Motion (src/components/motion.tsx, as the Autoply app): pages slide in from the right going deeper, from the left
  coming back, fade between sections. Pull down at the top to refresh with the 12-spoke spinner.
- Back uses the app's own history (app-state canGoBack), never history.length: that counts other sites and old builds, and once led to "page not found". Moved screens redirect in router/worker.js (MOVED), never delete a route without adding it there.
- From the owner's phone, after Autoply (2026-11-18): the status bar is black-translucent, so the page runs under it as
  in the Claude app. Screens change without new history entries (brand.tsx turns pushState into replaceState), so the
  iPhone edge swipe has nothing to go back to and opens the menu, and only the < button goes back. A haptic tick must be
  fired inside the tap or touchend itself (buzz() in the handler), never from an effect or touchmove: the iPhone drops
  those. The page never scrolls past its ends (overscroll-behavior none), no scroll bars anywhere, sheets sit 8 px off
  the bottom edge and their list fades out under the header. The icon's mark fills about 60 percent of the tile.
- Never remove a DOM node React rendered (the launch once did, l.remove(), and every page change after it crashed
  with "This page couldn't load"). Hide it with a class instead. Verification must include in-app navigation through
  the Worker (menu to every section, a row to a page, no reload, no page error), not only fresh page loads.
- Names follow the desktop portal: Morning Digest, Risk Management, Liquidity Management, WD Approvals, WD Check,
  Client 360, Notifications (behind the bell only, not in the menu), Access.
- Desktop (owner 2026-11-18, "phone environment for desktop like autoply"): at 700 px wide and 521 px tall or more the
  page shows Autoply's frame (motion.tsx DeviceFrame): the app in an iframe at 402 by up to 874, 20 px from the top,
  radius 44, 10 px #111113 bezel, on #e9e9ee (dark #1c1c1e), one line under it, a QR code beside it when the screen is
  over 1000 px. The app inside is the real phone layout; its address follows into the top bar. html.framed marks the
  outer page (no launch there), html.inframe the app inside (no scroll bar).

## Website cloner
This project started from JCodesMore/ai-website-cloner-template (MIT, see LICENSE). Its `/clone-website` command and
notes are in AGENTS.md. Use it to study a site's layout for inspiration, then design our own screens. Never ship another
company's logo, text, images or a copy of their pages.

@AGENTS.md

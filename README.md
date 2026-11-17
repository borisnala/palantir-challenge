# Risk Desk

The Global Risk Portal, rebuilt for a phone. A risk manager away from the desk sees what changed overnight, decides
pending withdrawals, checks a client and reads alerts, with one thumb.

All data is dummy. Built by Boris Nala.

## Screens
- **Today**: the morning digest in one sentence, what needs a decision, watchlist hits, tier moves, news coming up.
- **Approvals**: pending withdrawals with the reasons they were flagged. Approve, reject, undo.
- **Clients**: search, then a profile with P&L in client or broker view, balance, equity and open positions.
- **Alerts**: critical, warning and info alerts, with unread state.

## Run it
```
npm install
npm run dev        # http://localhost:3000
npm run check      # lint, typecheck, build
```
`npm run build` writes static files to `out/`.

## Code map
`bash scripts/map.sh` builds a graphify map of the code (also runs when a Claude Code session starts).
Then `graphify explain "ClientView"` shows where a component is and what it uses.

## Credits
Started from [ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template) (MIT).

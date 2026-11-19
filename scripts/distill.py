"""Turn the portal's dummy payloads (source/payloads/*.json.gz, exported from the desktop demo) into compact data for the
phone app (src/data/*.json). Same dummy numbers as the desktop portal, only the fields a phone screen shows.

  python3 scripts/distill.py

Every value here is dummy: logins 99000001.., "Demo Client N", groups under DUMMY. The confidential Algo Config page
(index) is never read.
"""
import gzip
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "source", "payloads")
OUT = os.path.join(ROOT, "src", "data")


def load(name):
    with gzip.open(os.path.join(SRC, name + ".json.gz"), "rt", encoding="utf-8") as f:
        return json.load(f)


def tidy(v):
    """The owner's style on screen: no semicolons or em dashes. Portal text such as screening reasons uses them."""
    if isinstance(v, str):
        return v.replace("; ", ", ").replace(";", ",").replace(" \u2014 ", ", ").replace("\u2014", ", ")
    if isinstance(v, list):
        return [tidy(x) for x in v]
    if isinstance(v, dict):
        return {k: tidy(x) for k, x in v.items()}
    return v


def save(name, data):
    data = tidy(data)
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name + ".json"), "w", encoding="utf-8") as f:
        json.dump(data, f, separators=(",", ":"), ensure_ascii=False)
    return os.path.getsize(os.path.join(OUT, name + ".json"))


def pick(d, *keys):
    return {k: d.get(k) for k in keys}


def r2(x):
    return round(x, 2) if isinstance(x, (int, float)) else x


out = {}

# ---- Today: morning digest ----
md = load("morning_digest")
row_keys = ("login", "name", "pg", "pg_before", "pg_now", "tier", "tier_before", "tier_now", "direction", "balance",
            "t30", "t30_before", "t30_now", "t30_delta", "t180", "fpl", "fpl_before", "fpl_now", "fpl_delta",
            "win_rate_pct", "profit_factor", "profit_factor_infinite", "last_trade_ts", "watchlist_status", "watchlist_note")
out["digest"] = {
    "taken_at": md["taken_at"], "previous_taken_at": md["previous_taken_at"], "headline": md["headline"],
    "totals": md["totals"],
    "sections": {k: [{x: r.get(x) for x in row_keys if x in r} for r in v] for k, v in md["sections"].items()},
}

# ---- Clients: profiles from Catches, growth momentum, open positions, watchlist ----
ca = load("catches")
gr = load("growth")
ol = load("open_lots")
wl = load("watchlist")
clients = {}
for p in ca["profiles"].values():
    clients[p["login"]] = {k: r2(p.get(k)) for k in ("login", "name", "group_now", "balance", "credit", "equity", "tall",
                                                        "t180", "t30", "fpl", "lots_30d", "win_rate", "deals_30d")}
for login, det in gr["detail"].items():
    c = clients.get(int(login))
    if c:
        c["momentum"] = det["momentum"]["label"]
        c["pg_moves"] = [pick(m, "time_wib", "from", "to", "from_tier", "to_tier", "source") for m in det["pg_moves"]]
        c["etl"] = det.get("etl", [])
for oc in ol["open"]["clients"]:
    c = clients.get(oc["login"])
    if c:
        c["open"] = {"positions": oc["positions"], "gross": oc["gross"], "net": oc["net"], "fpl": oc["fpl"],
                     "top_symbols": oc["top_symbols"], "mg": oc.get("mg")}
watch = {w["login"]: w for w in wl["live"]}
for login, w in watch.items():
    if login in clients:
        clients[login]["watched_by"] = w.get("watched_by")
out["clients"] = sorted(clients.values(), key=lambda c: c["login"])

# ---- Watchlist ----
out["watchlist"] = [pick(w, "login", "name", "group", "pg", "watched_at", "watched_by", "balance", "equity", "fpl", "t30",
                         "t_all", "closed_since", "float_delta", "since_total") for w in wl["live"]]

# ---- Withdrawals: approvals queue, WD Check previews, health ----
wd = load("wd_approvals")
wd_row = ("request_id", "ta_id", "client_id", "decision", "reason_code", "reasons", "checks", "elapsed_ms", "status",
          "decided_by", "decided_at", "amount", "currency", "bank_masked", "note", "flags", "family", "created_at",
          "history_flags")
out["withdrawals"] = {
    "mode": wd["mode"], "health": wd["health"], "default_ta": wd["default_ta"], "unknown_ta": wd["unknown_ta"],
    "rows": [{k: r.get(k) for k in wd_row if k in r} for r in wd["rows"]],
    "previews": {k: {x: v.get(x) for x in wd_row if x in v} for k, v in wd["previews"].items()},
}

# ---- Notifications (the desktop demo builds these in its shared mock: news profit alerts) ----
# (kept in src/lib/data.ts as ALERTS)

# ---- Top 10 ----
t10 = load("top10")
boards = {}
for key, b in t10["boards"].items():
    period, anchor, book, other, basis = key.split("|")
    if anchor or other != "0":
        continue
    p = b["period"]
    bb = p.get("boards", {})
    boards[f"{period}|{book}|{basis}"] = {
        "label": p.get("label"), "prev_label": p.get("prev_label"), "totals": p.get("totals"),
        "winners": [pick(r, "login", "name", "group", "pl", "deals", "win_rate", "pf", "prev_rank") for r in bb.get("winners", [])],
        "losers": [pick(r, "login", "name", "group", "pl", "deals", "win_rate", "pf", "prev_rank") for r in bb.get("losers", [])],
        "volume": [pick(r, "login", "name", "group", "lots", "deals", "avg_lot") for r in bb.get("volume", [])],
        "groups": bb.get("groups", []),
    }
out["top10"] = boards

# ---- Catches ----
out["catches"] = [pick(s, "algo", "kind", "acc", "day", "when", "from_group", "to_group", "reason", "tpl", "seen_ago_min",
                       "journal_actor", "journal_by") for s in ca["specs"]]

# ---- Growth Detection ----
gw = {}
for win, w in gr["windows"].items():
    gw[win] = {"scan_date": w["scan_date"], "total": w.get("total_matched"), "pg_counts": w.get("pg_counts"),
               "rows": [{k: r2(r.get(k)) for k in ("login", "net_change", "slope_per_day", "r_squared", "win_day_ratio",
                                                   "active_days", "balance", "max_drawdown", "eligible", "name", "group",
                                                   "pg", "consistency", "label") if k in r} for r in w["rows"]]}
out["growth"] = gw

# ---- Open Lots ----
o = ol["open"]
out["openlots"] = {"as_of": o["as_of"], "totals": o["totals"], "mg1": o["mg1"],
                   "clients": [pick(c, "login", "group", "micro", "excluded", "balance", "equity", "fpl", "positions",
                                    "gross", "net", "top_symbols", "mg", "age") for c in o["clients"]]}

# ---- News ----
nw = load("news")
news = {}
for key, l in nw["list"].items():
    news[key] = {"pending": l.get("pending"), "totals": l.get("totals"),
                 "upcoming": [pick(e, "id", "title", "currency", "impact", "event_time_utc", "forecast", "previous", "unit")
                              for e in (l.get("upcoming") or {}).get("list", [])],
                 "exposure": pick((l.get("upcoming") or {}).get("exposure") or {}, "accounts_with_positions",
                                  "gross_notional", "floating_pl", "top"),
                 "events": [pick(e, "id", "title", "currency", "impact", "source", "event_time_utc", "wib", "forecast",
                                 "previous", "actual", "unit", "status", "closed_net", "accounts_active")
                            for e in l.get("events", [])],
                 "hunters": l.get("hunters")}
events = {}
for eid, e in nw["event"].items():
    ev = e.get("event", {})
    events[eid] = {k: ev.get(k) for k in ("id", "title", "currency", "impact", "source", "wib", "forecast", "previous",
                                           "actual", "unit", "status", "accounts_active", "closed_net", "opened_lots",
                                           "closed_lots", "top_winner", "top_loser")}
    events[eid]["accounts"] = [pick(a, "login", "name", "close_net", "rel_net", "rel_kind", "lots") for a in
                               (e.get("accounts") or e.get("rows") or [])][:15]
out["news"] = {"lists": news, "events": events, "types": nw.get("types")}

# ---- Book View ----
hb = load("hsb_pov")
tx = hb["toxic"]
out["book"] = {"accounts": tx["accounts"], "by_pg": tx["by_pg"], "totals": tx["totals"],
               "symbols": tx["book"]["symbol_toxicity"], "exposure": tx["book"]["exposure"],
               "heatmap": tx["book"]["loss_heatmap"],
               "loss": {k: pick(v.get("meta", {}), "scope", "accounts_in_pool", "accounts_with_activity", "deals_counted")
                        | {"summary": v.get("summary") or v.get("totals")} for k, v in hb["loss"].items()}}

# ---- HouseCleaning ----
hc = load("housecleaning")
out["housecleaning"] = {"summary": hc["dashboard"]["summary"], "snapshot": hc["dashboard"]["snapshot"]["captured_at"],
                        "groups": hc["dashboard"]["groups"], "alerts": hc["dashboard"]["alerts"],
                        "config": hc["config"]}

# ---- Algo Activity, Risk Analysis ----
aa = load("algo_activity")
out["algoactivity"] = {w: {"start": v["window_start_wib"], "end": v["window_end_wib"],
                           "algos": {k: {"label": a["label"], "count": a["count"], "coverage": a["coverage"],
                                         "accounts": [pick(x, "login", "moved_at", "from_group", "to_group",
                                                           "requested_level", "ok", "move_performed", "from_tier")
                                                      for x in a["accounts"]]} for k, a in v["algos"].items()},
                           "risk": aa["risk"][w]["accounts"]} for w, v in aa["act"].items()}
ra = load("risk_analysis")
out["riskanalysis"] = {"analysis": ra["analysis"],
                       "protection": {k: {"by_algo": v["by_algo"], "totals": v["totals"], "window": v["window"],
                                          "rows": v["rows"][:60], "caveats": v.get("caveats")}
                                      for k, v in ra["protection"].items()},
                       "behaviour": ra["behaviour"]}

# ---- Liquidity: CLTL showcase, PG Markups, Manual Level, Group Spread ----
cl = load("candletl_showcase")
out["cltl"] = {"events": cl["tpl"]["events"], "report": cl["tpl"].get("report_generated_at"),
               "profile": pick(cl["profiles"]["active"], "label", "threshold_source", "hold_ttl_minutes"),
               "symbols": [{k: s.get(k) for k in ("symbol", "bid", "ask", "data_status", "spread_points", "daily_pct",
                                                  "m1_range_pct", "m5_range_pct", "effective_level", "sources",
                                                  "lptl_level", "lptl_y", "lptl_thresholds", "live_leader")}
                           | {"spreads": [x["spread"] for x in s.get("spread_series", [])]} for s in cl["tpl"]["symbols"]]}
pg = load("pg_markups")
out["pgmarkups"] = {"pg_order": pg["snapshot"]["pg_order"], "symbols": pg["snapshot"]["symbols"],
                    "markups": pg["snapshot"]["markups"], "labels": pg["snapshot"]["labels"],
                    "ib_rebate_bands": pg["snapshot"]["ib_rebate_bands"],
                    "fields": pg["config"]["fields"]}
ml = load("manual_level")["spreads"]
out["manuallevel"] = {"generated_at": ml["generated_at"], "unit": ml["unit"], "feeds": ml["feeds"],
                      "assets": {s: {"digits": a["digits"], "levels": a["levels"]} for s, a in ml["assets"].items()}}
gs = load("group_spread")
out["groupspread"] = {k: gs[k] for k in ("tiers", "paths", "not_in_map", "expected") if k in gs} | {
    "groups": gs.get("groups")}

# ---- Promotion, CRA ----
out["promotion"] = load("promotion_analysis")["jamesbond"]
cm = load("cra_model")
cra = load("cra_analysis")
out["cra"] = {"model": cm["model_get"], "history": cm.get("history"),
              "recent": cra["recent"]["items"], "stats": cra["stats"],
              "verify": cra.get("verify")}

# ---- Client 360 deep profile: the desktop demo's one full payload (login 99000001, all time) ----
def plain(t):
    """Portal prose for the phone: no colons, double hyphens or arrows."""
    if not isinstance(t, str):
        return t
    t = t.replace("Decision: ", "").replace(" -- ", ", ").replace(" - ", ", ").replace(" -> ", " to ").replace("->", " to ")
    return t.replace(": ", ", ")


c3 = load("client360")
cp = c3["profile"]["all"]
AS_OF = cp["windows"]["as_of"]
NOTIONAL = {"XAUUSD": 266700, "XAGUSD": 155000, "EURUSD": 108600, "GBPUSD": 127000, "USDJPY": 100000, "AUDUSD": 66000,
            "NZDUSD": 60000, "USDCAD": 100000, "GBPJPY": 127000, "TECH100": 402500, "SP500": 300000, "DJ30": 450000,
            "DE40": 240000, "USOIL": 70000, "ETHUSD": 3000, "BTCUSD": 90000}
# price, contract size, digits, and whether P&L is in the quote currency of a USD-base pair (USDJPY, USDCAD)
PRICE = {"XAUUSD": (2650.0, 100, 2, False), "XAGUSD": (31.2, 5000, 3, False), "EURUSD": (1.085, 100000, 5, False),
         "GBPUSD": (1.27, 100000, 5, False), "AUDUSD": (0.66, 100000, 5, False), "NZDUSD": (0.6, 100000, 5, False),
         "USDJPY": (151.2, 100000, 3, True), "USDCAD": (1.36, 100000, 5, True), "GBPJPY": (192.4, 100000, 3, True),
         "TECH100": (20150.0, 20, 1, False), "SP500": (5950.0, 50, 1, False), "DJ30": (43200.0, 10, 0, False),
         "DE40": (19400.0, 12, 1, False), "USOIL": (70.2, 1000, 2, False), "ETHUSD": (3300.0, 1, 2, False), "BTCUSD": (90000.0, 1, 1, False)}


def priced(sym, side, lots, floating):
    """Open and current price for a position, so that (price - open) x lots x contract size equals its floating P&L."""
    price, cs, digits, usd_base = PRICE.get(sym, (100.0, 1000, 2, False))
    sign = 1 if side == "LONG" else -1
    per = lots * cs * sign / (price if usd_base else 1)
    open_ = price - (floating / per if per else 0)
    return {"price": price, "open_price": round(open_, digits), "contract_size": cs, "digits": digits, "usd_base": usd_base,
            "gross_notional": r2(lots * cs * (1 if usd_base else price))}


POOL = ["XAUUSD", "EURUSD", "GBPUSD", "XAGUSD", "TECH100", "SP500", "DJ30", "AUDUSD", "USDJPY", "USOIL", "DE40", "NZDUSD"]
BUCKETS = ["<3m", "3-15m", "15m-1h", "1-4h", "4-24h", ">1d"]
STYLE = {"<3m": "Scalper", "3-15m": "Scalper", "15m-1h": "Intraday trader", "1-4h": "Intraday trader", "4-24h": "Day trader", ">1d": "Swing trader"}
HOLD = {"<3m": "1m 48s", "3-15m": "7m 12s", "15m-1h": "31m 5s", "1-4h": "2h 9m", "4-24h": "9h 40m", ">1d": "1d 6h"}


def usd(x):
    return ("($%s)" % f"{abs(x):,.2f}") if x < 0 else f"${x:,.2f}"


def series_stats(daily):
    cum, peak, trough, dd, run_peak = 0.0, 0.0, 0.0, 0.0, 0.0
    for _, v in daily:
        cum += v
        peak, trough = max(peak, cum), min(trough, cum)
        run_peak = max(run_peak, cum)
        dd = max(dd, run_peak - cum)
    vals = [v for _, v in daily]
    return {"net_pl": r2(cum), "peak": r2(peak), "trough": r2(trough), "max_drawdown": r2(dd),
            "best_day": r2(max(vals)), "worst_day": r2(min(vals))}


def split(total, weights, rng, noise=0.35):
    w = [x * (1 + rng.uniform(-noise, noise)) for x in weights]
    t = sum(w) or 1
    return [total * x / t for x in w]


def real_profile():
    sg, beh, win, ex = cp["signals"], cp["behaviour"], cp["windows"], cp["exec_summary"]
    sym_pl = {r["symbol"]: r for r in sg["symbol_pl"]["rows"]}
    daily = [[q["day"], r2(q["daily"])] for q in cp["realized"]["pl_timeline"]]
    hp = [[q["day"], r2(q["daily"])] for q in cp["realized_hpov"]["pl_timeline"]]
    return {
        "source": "portal",
        "identity": pick(cp["identity"], "group", "group_tier", "country", "leverage", "registration", "last_access",
                         "balance", "equity", "margin_free", "credit"),
        "classification": cp["classification"]["label"],
        "lead": cp["tatto"]["parsed"]["label"] if cp.get("tatto") and cp["tatto"].get("parsed") else None,
        "toxicity": {"score": sg["toxicity"]["score"], "band": sg["toxicity"]["band"],
                     "factors": [{"points": f["points"], "label": plain(f["label"])} for f in sg["toxicity"]["factors"]]},
        "decision": {"verdict": ex["decision"]["verdict"], "headline": plain(ex["decision"]["headline"])},
        "metrics": [{"metric": m["metric"], "result": m["result"], "note": plain(m["interpretation"])} for m in ex["metrics"]],
        "findings": [plain(f) for f in ex["findings"]],
        "machinegun": pick(sg["machinegun"], "detected", "tier", "client_type"),
        "scalper": {**pick(sg["scalper"], "detected", "tier", "scope_note"), "evidence": sg["scalper"]["evidence"]},
        "force_buildup": pick(sg["force_buildup"], "detected", "tier", "conditions", "evidence"),
        "catches": cp["algo_catches"],
        "behaviour": {k: r2(beh[k]) for k in ("trade_count", "win_rate_pct", "profit_factor", "avg_win", "avg_loss",
                                             "median_hold_label", "overnight_pct", "total_lots")},
        "daily": daily, "daily_hpov": hp, "stats": series_stats(daily), "stats_hpov": series_stats(hp),
        "sessions": sg["sessions"],
        "symbols": [{"symbol": x["symbol"], "pct": x["pct"], "lots": x["lots"],
                     "pl": sym_pl.get(x["symbol"], {}).get("net_pl"), "hpov": sym_pl.get(x["symbol"], {}).get("hpov_pl"),
                     "trades": sym_pl.get(x["symbol"], {}).get("trades"), "win": sym_pl.get(x["symbol"], {}).get("win_rate")}
                    for x in beh["symbol_concentration"]],
        "holding": [pick(h, "bucket", "trades", "win_rate", "total_pl", "trade_share_pct") for h in sg["holding_pl"]["buckets"]],
        "windows": {**pick(win, "t_all", "t180", "t30", "fpl", "t_all_net", "t_all_commission", "t_all_swap",
                           "lifetime_deposits", "lifetime_withdrawals"), "hpov": win["hpov"],
                    "fpl_check": pick(win["fpl_reconciliation"], "account_fpl", "position_floating", "difference", "status")},
        "exposure": {"symbols": [{**pick(x, "symbol", "direction", "gross_lots", "floating"), **priced(x["symbol"], x["direction"], x["gross_lots"], x["floating"])}
                                 for x in cp["exposure"]["symbols"]],
                     "totals": cp["exposure"]["totals"]},
        "group_changes": [{"day": c["day"], "title": f"{c['from_tier']} to {c['to_tier']}" if c["from_tier"] else f"Opened in {c['to_tier']}",
                           "sub": "Manual move" if c["source"] == "manual" else c["source"]} for c in cp["group_timeline"]["changes"]]
                         + [{"day": e["epoch"],
                             "title": f"{e['from_tier']} to {e['to_tier']}",
                             "sub": "Equity traffic light, " + ("promotion" if e["kind"] == "promote" else "demotion")} for e in cp["etl_log"]["events"]],
        "withdrawals": pick(cp["withdrawal_velocity"], "withdrawal_count", "net_flow", "fastest_withdraw_after_profit_days",
                            "avg_days_between_withdrawals", "fast_withdrawer", "history"),
    }


def wib_epoch(t):
    import datetime
    return int(datetime.datetime.strptime(t[:16], "%Y-%m-%d %H:%M").replace(tzinfo=datetime.timezone(datetime.timedelta(hours=7))).timestamp())


def variant(c, base):
    """A Client 360 for a client the demo has no full payload for: the portal payload's shape and rhythm, reshaped
    with a seed per login to the client's own figures (P&L windows, win rate, lots, open book, group moves, ETL)."""
    import random
    rng = random.Random(c["login"])
    T = c["tall"] or 0.0
    win_rate = c["win_rate"] or 55.0
    days = sorted(rng.sample([d for d, _ in base["daily"]], k=int(len(base["daily"]) * rng.uniform(0.55, 0.95))))
    mags = [abs(rng.choice(base["daily"])[1]) + 5 for _ in days]
    k = (abs(T) * rng.uniform(1.5, 2.6) + 500) / sum(mags)
    mags = [m * k for m in mags]
    signs = [1 if rng.random() < win_rate / 100 else -1 for _ in days]
    P = sum(m for m, s_ in zip(mags, signs) if s_ > 0) or 1
    N = sum(m for m, s_ in zip(mags, signs) if s_ < 0) or 1
    a, b = (T + N) / P, 1.0
    if a < 0.3:
        a = 0.3
        b = (a * P - T) / N
    daily = [[d, r2(m * (a if s_ > 0 else b) * s_)] for d, m, s_ in zip(days, mags, signs)]
    hp = [[d, r2(-v)] for d, v in daily]
    st, sth = series_stats(daily), series_stats(hp)
    trades = rng.randint(140, 620)
    lots_total = r2((c["lots_30d"] or rng.uniform(20, 120)) * rng.uniform(2.5, 6))

    sess_names = ["Asian", "London", "New York", "Late"]
    sw = [rng.uniform(.03, .15), rng.uniform(.3, .5), rng.uniform(.3, .5), rng.uniform(.004, .02)]
    st_trades = [max(1, round(trades * w / sum(sw))) for w in sw]
    st_pl = split(T, sw, rng, 0.6)
    if rng.random() < 0.5:
        st_pl[0] = -abs(st_pl[0]) * rng.uniform(0.2, 1)
    sessions = [{"session": n, "trades": t_, "net_pl": r2(v), "win_rate": r2(min(99, max(20, win_rate + rng.uniform(-9, 9))))}
                for n, t_, v in zip(sess_names, st_trades, st_pl)]

    open_syms = [s_ for s_, _ in ((c.get("open") or {}).get("top_symbols") or [])]
    syms = list(dict.fromkeys(open_syms + rng.sample(POOL, 7)))[:7]
    w = sorted([rng.uniform(0.2, 1) ** 2 for _ in syms], reverse=True)
    pcts = [r2(100 * x / sum(w)) for x in w]
    s_pl = split(T, w, rng, 0.9)
    symbols = [{"symbol": sy, "pct": pc, "lots": r2(lots_total * pc / 100), "pl": r2(v), "hpov": r2(-v),
                "trades": max(1, round(trades * pc / 100)), "win": r2(min(99, max(20, win_rate + rng.uniform(-12, 12))))}
               for sy, pc, v in zip(syms, pcts, s_pl)]

    hw = [rng.uniform(0.05, 1) for _ in BUCKETS]
    h_trades = [max(1, round(trades * x / sum(hw))) for x in hw]
    h_pl = split(T, hw, rng, 0.8)
    holding = [{"bucket": bk, "trades": t_, "win_rate": r2(min(99, max(20, win_rate + rng.uniform(-10, 10)))),
                "total_pl": r2(v), "trade_share_pct": r2(100 * t_ / sum(h_trades))} for bk, t_, v in zip(BUCKETS, h_trades, h_pl)]
    top_bucket = BUCKETS[max(range(6), key=lambda i: hw[i])]
    fast_share = (h_trades[0] + h_trades[1]) / sum(h_trades) * 100

    op = c.get("open") or {}
    mg = op.get("mg") or {}
    factors = []
    if mg.get("tier"):
        factors.append({"points": 10 * mg["tier"] + 8, "label": f"MachineGun tier {mg['tier']}, {num_(mg.get('lots'))} lots in {mg.get('window')} s"})
    scalper = fast_share > 28 and win_rate >= 55
    sc_tier = 3 if fast_share > 45 else 2 if fast_share > 35 else 1
    if scalper:
        factors.append({"points": 14 + 9 * sc_tier, "label": f"ScalperAM SC{sc_tier}, profitable fast in and out ({h_trades[0] + h_trades[1]} fast trades, {win_rate:.0f}% win)"})
    if c.get("momentum") == "accelerating":
        factors.append({"points": 12, "label": f"Recent behaviour escalation, last 30 days {usd(c['t30'] or 0)} against {usd((c['t180'] or 0) / 6)} a month before"})
    if win_rate >= 80:
        factors.append({"points": 10, "label": f"Win rate {win_rate:.1f}% over {trades} trades"})
    if len(c.get("etl") or []) >= 2:
        factors.append({"points": 6, "label": f"{len(c['etl'])} equity traffic light moves"})
    if T > 0:
        factors.append({"points": 8 if T < 20000 else 14, "label": f"Profitable account, {usd(T)} all time"})
    if not factors:
        factors.append({"points": 6, "label": "No pattern beyond normal trading"})
    score = min(97, sum(f_["points"] for f_ in factors))
    band = "low" if score < 35 else "elevated" if score < 65 else "high"
    verdict = "hedge" if score >= 50 and T > 0 else "warehouse" if (T <= 0 or score < 30) else "insufficient-evidence"
    headline = {
        "hedge": f"Hedge all client flow. The closed sample produced HPOV trading P&L of {usd(-T)} and an HPOV maximum drawdown of {usd(sth['max_drawdown'])}.",
        "warehouse": f"Warehouse the flow. The closed sample shows no repeatable edge, HPOV trading P&L {usd(-T)}.",
        "insufficient-evidence": f"More evidence required. The sample of {trades} trades does not yet show a repeatable edge.",
    }[verdict]
    gross, net = op.get("gross") or 0, op.get("net") or 0
    pos_v = [v for _, v in hp if v > 0]
    neg_v = [-v for _, v in hp if v < 0]
    pf = r2(sum(pos_v) / sum(neg_v)) if neg_v else None
    metrics = [
        {"metric": "Closed positions", "result": str(trades), "note": "Large enough to show repeated behaviour." if trades > 200 else "A small sample, read with care."},
        {"metric": "Closed HPOV trading P&L", "result": usd(-T), "note": "The client is profitable, direct warehousing lost money." if T > 0 else "The book gained from this client."},
        {"metric": "HPOV win rate", "result": f"{100 - win_rate:.2f}%", "note": "Share of closed positions the book won."},
        {"metric": "HPOV profit factor", "result": f"{pf}x" if pf is not None else "No losses", "note": "Below 1.0, gross HPOV losses exceed gross wins." if (pf or 0) < 1 else "Above 1.0, the book wins overall."},
        {"metric": "Max HPOV drawdown", "result": usd(sth["max_drawdown"]), "note": "Largest fall from a peak on the book side."},
        {"metric": "Current gross / net lots", "result": f"{gross:.2f}/{abs(net):.2f}", "note": "Most of the open book is hedged inside the account." if gross and abs(net) < gross / 2 else "The open book is directional."},
    ]
    findings = [
        f"{holding[BUCKETS.index(top_bucket)]['trade_share_pct']:.1f}% of closed positions held for {top_bucket.replace('<', 'under ').replace('>', 'over ')}, the sample is concentrated in this holding-time bucket.",
        f"London and New York hold {100 * (st_trades[1] + st_trades[2]) / sum(st_trades):.0f}% of trades.",
    ]
    if gross:
        findings.append(f"Gross open lots ({gross:.2f}) against net lots ({abs(net):.2f}).")
    conds = {"c1_baseline": rng.random() < .3, "c2_deposit": rng.random() < .3, "c3_exposure": rng.random() < .25, "c4_equity": rng.random() < .5}
    fb = sum(conds.values()) >= 3

    pos = op.get("top_symbols") or []
    fpl = c["fpl"] if c["fpl"] is not None else (op.get("fpl") or 0)
    tl = sum(l for _, l in pos) or 1
    exp_rows = [{"symbol": sy, "direction": "SHORT" if net < 0 else "LONG", "gross_lots": l, "floating": r2(fpl * l / tl),
                 **priced(sy, "SHORT" if net < 0 else "LONG", l, fpl * l / tl)} for sy, l in pos]
    gn = sum(x["gross_notional"] for x in exp_rows)
    bal = c["balance"] or 0
    exposure = {"symbols": exp_rows, "totals": {"gross_notional": r2(gn), "net_notional": r2(gn if net >= 0 else -gn), "floating": r2(fpl),
                                                "position_count": op.get("positions") or 0, "balance": bal,
                                                "gross_notional_pct_of_balance": r2(100 * gn / bal) if bal else 0}}

    comm = r2(-lots_total * rng.uniform(2, 6))
    swap = r2(-abs(T) * rng.uniform(0, 0.02))
    w_n = rng.randint(0, 4)
    hist = sorted([{"epoch": AS_OF - rng.randint(5, 300) * 86400, "amount": float(rng.choice([500, 800, 1000, 1200, 1500, 2000, 2500, 3000, 4000, 5000]))} for _ in range(w_n)], key=lambda h: -h["epoch"])
    wsum = sum(h["amount"] for h in hist)
    tnet = r2(T + comm + swap)
    deps = max(1000.0, round((bal - tnet + wsum) / 500) * 500)
    fpl_pos = r2(fpl + rng.choice([0, 0, rng.uniform(-12, 12)]))
    tier = (c["group_now"] or "").split("\\")[-1]
    changes = [{"day": wib_epoch(m["time_wib"]), "title": f"{m['from_tier']} to {m['to_tier']}", "sub": f"{m['source']} move"} for m in (c.get("pg_moves") or [])]
    changes += [{"day": wib_epoch(e["time_wib"]), "title": e["reason"], "sub": f"Equity traffic light, {e['tpl']}"} for e in (c.get("etl") or [])]
    return {
        "source": "variant",
        "identity": {"group": c["group_now"], "group_tier": tier, "country": rng.choice(["Singapore", "Malaysia", "Thailand", "Vietnam", "Indonesia", "Philippines", "UAE"]),
                     "leverage": rng.choice([100, 200, 400, 500]), "registration": days[0] - rng.randint(5, 90) * 86400,
                     "last_access": AS_OF - rng.randint(2, 600) * 60, "balance": bal, "equity": c["equity"],
                     "margin_free": r2((c["equity"] or 0) - gn / 200), "credit": c["credit"]},
        "classification": STYLE[top_bucket], "lead": None,
        "toxicity": {"score": score, "band": band, "factors": sorted(factors, key=lambda f_: -f_["points"])},
        "decision": {"verdict": verdict, "headline": headline}, "metrics": metrics, "findings": findings,
        "machinegun": {"detected": bool(mg.get("tier")), "tier": mg.get("tier") or None, "client_type": "micro" if "Mini" in (c["group_now"] or "") else "normal"},
        "scalper": {"detected": scalper, "tier": f"SC{sc_tier}" if scalper else None, "scope_note": "based on last 30 positions",
                    "evidence": {"radar_count": round(30 * fast_share / 100), "lookback": 30, "win_rate": r2(win_rate), "total_pl": r2(T * fast_share / 100), "hold_max_seconds": 180}},
        "force_buildup": {"detected": fb, "tier": "FB1" if fb else None, "conditions": conds,
                          "evidence": {"max_ticket_lots": r2(max([l for _, l in pos] or [0.5])), "peak_15m_exposure_lots": r2(gross or 0.5)}},
        "catches": [],
        "behaviour": {"trade_count": trades, "win_rate_pct": win_rate, "profit_factor": r2(sum(v for _, v in daily if v > 0) / max(1, -sum(v for _, v in daily if v < 0))),
                      "avg_win": None, "avg_loss": None, "median_hold_label": HOLD[top_bucket], "overnight_pct": r2(holding[5]["trade_share_pct"] + holding[4]["trade_share_pct"] / 3),
                      "total_lots": lots_total},
        "daily": daily, "daily_hpov": hp, "stats": st, "stats_hpov": sth,
        "sessions": sessions, "symbols": symbols, "holding": holding,
        "windows": {"t_all": T, "t180": c["t180"], "t30": c["t30"], "fpl": fpl, "t_all_net": tnet, "t_all_commission": comm, "t_all_swap": swap,
                    "lifetime_deposits": deps, "lifetime_withdrawals": wsum,
                    "hpov": {"t_all": r2(-T), "t180": r2(-(c["t180"] or 0)), "t30": r2(-(c["t30"] or 0))},
                    "fpl_check": {"account_fpl": fpl, "position_floating": fpl_pos, "difference": r2(abs(fpl - fpl_pos)), "status": "mismatch" if abs(fpl - fpl_pos) > 1 else "ok"}},
        "exposure": exposure, "group_changes": changes,
        "withdrawals": {"withdrawal_count": w_n, "net_flow": r2(deps - wsum), "fastest_withdraw_after_profit_days": rng.randint(2, 240) if w_n else None,
                        "avg_days_between_withdrawals": rng.randint(9, 80) if w_n > 1 else None, "fast_withdrawer": bool(w_n >= 3 and rng.random() < .4), "history": hist},
    }


def num_(v):
    return f"{v:g}" if isinstance(v, (int, float)) else "some"


profiles = {}
real = real_profile()
for c in out["clients"]:
    profiles[str(c["login"])] = real if c["login"] == c3["login"] else variant(c, real)
out["client360"] = {"as_of": AS_OF, "real_login": c3["login"], "profiles": profiles}

# ---- Admin: users, devices, build paths ----
out["users"] = load("users")
out["buildpaths"] = load("build_paths")

total = 0
for name, data in out.items():
    size = save(name, data)
    total += size
    print(f"{name:14} {size / 1024:7.1f} kB")
print(f"{'total':14} {total / 1024:7.1f} kB")

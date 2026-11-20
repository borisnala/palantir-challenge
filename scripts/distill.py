"""Turn the portal's dummy payloads (source/payloads/*.json.gz, exported from the desktop demo) into compact data for the
phone app (src/data/*.json). Same dummy numbers as the desktop portal, only the fields a phone screen shows.

  python3 scripts/distill.py

Every value here is dummy: logins 99000001.., "Demo Client N", groups under DUMMY. The confidential Algo Config page
(index) is never read.
"""
import gzip
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "source", "payloads")
OUT = os.path.join(ROOT, "src", "data")


def load(name):
    with gzip.open(os.path.join(SRC, name + ".json.gz"), "rt", encoding="utf-8") as f:
        return json.load(f)


def tidy(v):
    """The owner's style on screen: no colons, semicolons, em dashes or ASCII arrows. Portal text such as screening
    reasons and tier transitions uses them. Times (08:53) and paths (C:\\) keep theirs: only a colon before a space goes."""
    if isinstance(v, str):
        v = v.replace("; ", ", ").replace(";", ",").replace(" \u2014 ", ", ").replace("\u2014", ", ")
        return re.sub(r"(?<=[A-Za-z)]): ", ", ", v.replace(" -> ", " to ").replace("->", " to "))
    if isinstance(v, list):
        return [tidy(x) for x in v]
    if isinstance(v, dict):
        return {k: tidy(x) for k, x in v.items()}
    return v


def save(name, data):
    data = tidy(data)
    os.makedirs(os.path.dirname(os.path.join(OUT, name + ".json")), exist_ok=True)
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
        "activity": [pick(r, "login", "name", "group", "pl", "deals", "active_days", "win_rate") for r in bb.get("activity", [])],
        "movers": [pick(r, "login", "name", "group", "pl", "delta", "prev_pl", "is_new", "deals") for r in bb.get("movers", [])],
        "consistency": [pick(r, "login", "name", "group", "pl", "active_days", "win_rate", "pf") for r in bb.get("consistency", [])],
        "instruments": [pick(r, "symbol", "lots", "profit", "deals", "traders", "top_login", "top_share_pct") for r in bb.get("instruments", [])],
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
gw["detail"] = {lg: {"momentum": d.get("momentum"), "moves": [pick(m, "time_wib", "from_tier", "to_tier", "source_detail") for m in d.get("pg_moves", [])],
                     "etl": d.get("etl", [])} for lg, d in gr["detail"].items()}
out["growth"] = gw

# ---- Open Lots ----
o = ol["open"]
out["openlots"] = {"as_of": o["as_of"], "totals": o["totals"], "mg1": o["mg1"],
                   "clients": [pick(c, "login", "group", "micro", "excluded", "balance", "equity", "fpl", "positions",
                                    "gross", "net", "top_symbols", "mg", "age") for c in o["clients"]]}
# Closed lots history: per window, the family filter that covers the most clients (all families)
hist = {}
for k, v in ol["hist"].items():
    w = "|".join(k.split("|")[:2])
    if w not in hist or len(v.get("clients", [])) > len(hist[w]["clients"]):
        hist[w] = {"from": v["from"], "to": v["to"], "totals": v["totals"],
                   "quadrants": {m: {"title": q["title"], "x_label": q["x_label"], "y_label": q["y_label"], "x_div": q["x_div"], "y_div": q["y_div"],
                                     "cells": {c: pick(z, "short", "pos", "clients", "lots", "pl") for c, z in q["quadrants"].items()}}
                                 for m, q in v["quadrants"].items()},
                   "clients": [pick(c, "login", "family", "excluded", "lots", "deals", "avg_lot", "active_days", "deals_per_day", "pl", "win_rate", "quadrant")
                               for c in v["clients"]]}
out["openlots"]["history"] = hist

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
                        | {"summary": v.get("summary") or v.get("totals"),
                           "board": [pick(c, "symbol", "net_broker", "deals", "lots", "activity_share_pct", "profit_share_pct", "profit_lift_pp",
                                          "loss_share_pct", "loss_lift_pp", "side", "material") for c in v.get("concentration", [])]}
                        for k, v in hb["loss"].items()},
               "pnlmm": {scope: {"totals": v["totals"], "rows": [pick(r, "login", "hpov_usd", "notional_usd", "pnl_per_mm", "deals", "lots", "tier", "reliable")
                                                                  for r in v["rows"]]} for scope, v in hb["pnlmm"].items()}}

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

    # Half the book trades live, half is flat (owner 2026-11-19, "half not active, half active"): odd logins keep
    # their open positions, even logins have closed everything, so no floating P&L and equity equals balance
    live = c["login"] % 2 == 1
    pos = (op.get("top_symbols") or []) if live else []
    fpl = (c["fpl"] if c["fpl"] is not None else (op.get("fpl") or 0)) if live else 0.0
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
    # Deposits, P&L and withdrawals must add up to the balance (owner 2026-11-20, a negative balance on the growth
    # chart). When the client's P&L is larger than the balance can hold, the profit left as withdrawals: they are
    # rebuilt from the P&L curve, taken out in round amounts once the account holds them, so the balance never dips
    # below zero on the way.
    need = r2(deps + tnet - bal)
    if need > wsum + 1:
        hist, cum, taken = [], 0.0, 0.0
        chunk = max(500.0, round(need / min(8, max(1, int(need // 2500) + 1)) / 100) * 100)
        for dday, v in daily:
            cum += v
            while need - taken > 1 and deps + cum - taken - min(chunk, need - taken) > 300:
                amt = r2(min(chunk, need - taken))
                hist.append({"epoch": dday + 86400 * rng.randint(1, 3), "amount": amt}); taken += amt
        if need - taken > 1:
            hist.append({"epoch": daily[-1][0], "amount": r2(need - taken)})
        # a loss after a withdrawal can still take the curve under zero: deposit more at the start and take the same
        # amount out on the last day, so the curve lifts and the balance today stays the same
        cum, low = 0.0, 0.0
        for dday, v in daily:
            cum += v
            low = min(low, deps + cum - sum(h["amount"] for h in hist if h["epoch"] <= dday))
        if low < 300:
            lift = float(round((300 - low) / 500 + 0.5) * 500)
            deps += lift
            hist.append({"epoch": daily[-1][0], "amount": lift})
        hist = sorted(hist, key=lambda h: -h["epoch"])
        w_n, wsum = len(hist), r2(sum(h["amount"] for h in hist))
    fpl_pos = r2(fpl + rng.choice([0, 0, rng.uniform(-12, 12)]))
    tier = (c["group_now"] or "").split("\\")[-1]
    changes = [{"day": wib_epoch(m["time_wib"]), "title": f"{m['from_tier']} to {m['to_tier']}", "sub": f"{m['source']} move"} for m in (c.get("pg_moves") or [])]
    changes += [{"day": wib_epoch(e["time_wib"]), "title": e["reason"], "sub": f"Equity traffic light, {e['tpl']}"} for e in (c.get("etl") or [])]
    return {
        "source": "variant",
        "identity": {"group": c["group_now"], "group_tier": tier, "country": rng.choice(["Singapore", "Malaysia", "Thailand", "Vietnam", "Indonesia", "Philippines", "UAE"]),
                     "leverage": rng.choice([100, 200, 400, 500]), "registration": days[0] - rng.randint(5, 90) * 86400,
                     "last_access": AS_OF - rng.randint(2, 600) * 60, "balance": bal, "equity": c["equity"] if live else bal,
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


def with_trades(prof, login):
    """Per-day net lots (the bars under the P&L chart) and each trading day's buys and sells by symbol (the marks on
    the trading pattern chart). 99000001 from the portal's own daily positions, the others seeded from their figures."""
    import random
    top = [x["symbol"] for x in prof["symbols"][:4]]
    trades = {sy: [] for sy in top}
    net = []
    if login == c3["login"]:
        for dpos in cp["signals"]["daily_positions"]:
            n = 0.0
            for x in dpos["symbols"]:
                n += x.get("net_exposure") or 0
                if x["symbol"] in trades and x.get("trades"):
                    trades[x["symbol"]].append([dpos["day"], 1 if (x.get("net_exposure") or 0) >= 0 else -1, r2(x["lots"]), r2(x.get("net_pl") or 0)])
            net.append([dpos["day"], r2(n)])
    else:
        rng = random.Random(login * 7 + 3)
        w = [x["pct"] for x in prof["symbols"][:4]]
        bias = rng.uniform(0.35, 0.7)
        for d, v in prof["daily"]:
            n = 0.0
            for sy in rng.choices(top, weights=w, k=rng.choice([1, 1, 2])):
                side = 1 if rng.random() < bias else -1
                lots = r2(max(0.01, rng.uniform(0.05, 1.2) * (prof["behaviour"]["total_lots"] or 100) / 400))
                n += side * lots
                trades[sy].append([d, side, lots, r2(v * rng.uniform(0.3, 0.9))])
            net.append([d, r2(n)])
    prof["netlots"] = net
    prof["trades"] = trades
    return prof


def monthly(prof, login):
    """Monthly history over the account's life, the portal's MONTHLY HISTORY panel (owner 2026-11-20, "page 5, make
    this a pop up"). 99000001 from the portal's own months, every other client rolled up from its own daily P&L and
    trades, month-end balance walked back from today's balance, so each month adds up to the profile."""
    import datetime, random
    mon = lambda t: datetime.datetime.fromtimestamp(t, datetime.timezone.utc).strftime("%Y-%m")
    if login == c3["login"]:
        mh = cp["monthly_history"]
        keep = ("month", "open_lot", "close_lot", "trades", "win_rate", "net_exposure", "hold_days", "pl", "balance", "equity")
        return {"months": [{**{k: m.get(k) for k in keep}, "assets": [a for a in m["assets"] if a["pct"] > 0],
                            "symbols": [{k: x.get(k) for k in ("symbol", "trades", "lots", "net_exposure", "pl", "win_rate", "hold_days")} for x in m["symbols"]]}
                           for m in mh["months"]],
                "total": {k: mh["total"].get(k) for k in keep if k != "month"} | {"assets": mh["total"]["assets"]}}
    rng = random.Random(login * 13 + 5)
    pl, days, wins = {}, {}, {}
    for d, v in prof["daily"]:
        m = mon(d); pl[m] = pl.get(m, 0) + v; days[m] = days.get(m, 0) + 1; wins[m] = wins.get(m, 0) + (v > 0)
    sym = {}
    for sy, rows in prof["trades"].items():
        for d, side, lots, pnl in rows:
            x = sym.setdefault(mon(d), {}).setdefault(sy, {"symbol": sy, "trades": 0, "lots": 0.0, "net_exposure": 0.0, "pl": 0.0, "w": 0})
            n = rng.randint(1, 3)
            x["trades"] += n; x["lots"] += lots; x["net_exposure"] += side * lots * rng.uniform(0, 0.3); x["pl"] += pnl; x["w"] += n if pnl > 0 else rng.randint(0, n - 1)
    out_m, bal = [], prof["identity"]["balance"]
    wd = prof["withdrawals"]["history"]
    for m in sorted(pl, reverse=True):
        rows = list(sym.get(m, {}).values())
        raw = sum(x["pl"] for x in rows) or 1
        for x in rows:
            x["pl"] = r2(pl[m] * x["pl"] / raw); x["lots"] = r2(x["lots"]); x["net_exposure"] = r2(x["net_exposure"])
            x["win_rate"] = r2(100 * x.pop("w") / max(1, x["trades"])); x["hold_days"] = r2(rng.uniform(0, 1.2))
        rows.sort(key=lambda x: -x["lots"])
        lots = sum(x["lots"] for x in rows) or 1
        n = sum(x["trades"] for x in rows)
        out_m.append({"month": m, "open_lot": r2(lots), "close_lot": r2(lots * rng.uniform(0.97, 1.0)), "trades": n,
                      "win_rate": r2(100 * sum(x["trades"] * x["win_rate"] / 100 for x in rows) / max(1, n)),
                      "net_exposure": r2(sum(x["net_exposure"] for x in rows)), "hold_days": r2(rng.uniform(0.1, 1.0)),
                      "pl": r2(pl[m]),
                      "assets": [{"symbol": x["symbol"], "pct": round(100 * x["lots"] / lots)} for x in rows], "symbols": rows})
    out_m.reverse()
    # Balance runs forward from the deposits, P&L in and withdrawals out each month. Commission and swap are spread
    # evenly, so the last month lands on today's balance.
    run, fw = prof["windows"].get("lifetime_deposits") or 0, []
    for m in out_m:
        run += m["pl"] - sum(w["amount"] for w in wd if mon(w["epoch"]) == m["month"]); fw.append(run)
    res = bal - fw[-1] if fw else 0
    for i, m in enumerate(out_m):
        c = res * (i + 1) / len(out_m) if i < len(out_m) - 1 else res
        m["balance"] = r2(fw[i] + max(c, -0.85 * max(fw[i], 0))); m["equity"] = m["balance"]
    if out_m:
        out_m[-1]["equity"] = r2(prof["identity"]["equity"])
    tl = sum(m["open_lot"] for m in out_m) or 1
    agg_ = {}
    for m in out_m:
        for x in m["symbols"]:
            agg_[x["symbol"]] = agg_.get(x["symbol"], 0) + x["lots"]
    nt = sum(m["trades"] for m in out_m)
    return {"months": out_m, "total": {"open_lot": r2(tl), "close_lot": r2(sum(m["close_lot"] for m in out_m)), "trades": nt,
            "pl": r2(sum(m["pl"] for m in out_m)), "hold_days": r2(sum(m["hold_days"] for m in out_m) / max(1, len(out_m))),
            "win_rate": r2(sum(m["trades"] * m["win_rate"] for m in out_m) / max(1, nt)),
            "net_exposure": r2(sum(m["net_exposure"] for m in out_m)), "balance": prof["identity"]["balance"], "equity": prof["identity"]["equity"],
            "assets": sorted([{"symbol": k, "pct": round(100 * v / tl)} for k, v in agg_.items()], key=lambda a: -a["pct"])}}


profiles = {}
real = real_profile()
for c in out["clients"]:
    profiles[str(c["login"])] = with_trades(real if c["login"] == c3["login"] else variant(c, real), c["login"])
    profiles[str(c["login"])]["monthly"] = monthly(profiles[str(c["login"])], c["login"])
# One file per client, loaded when that profile opens (owner 2026-11-19, lazy loading per artifact), and a small shared
# file with the snapshot time and the price table
out["client360meta"] = {"as_of": AS_OF, "real_login": c3["login"], "prices": {k: [v[0], v[2]] for k, v in PRICE.items()}}
for login, prof in profiles.items():
    out[f"c360/{login}"] = prof

# ---- Admin: users, devices, build paths ----
out["users"] = load("users")
out["buildpaths"] = load("build_paths")

# ---- Notifications (owner 2026-11-20, "enrich the notification lists") ----
# The bell gathers what the desk is told during a day: the portal's own news profit notifications (the 16 rows its
# shared mock builds, kit/mock.js SPECS, as notify.py produces them), the Morning Digest changes, today's algorithm
# moves from Catches and the withdrawals waiting for Risk. Minutes are before the snapshot.
NEWS_EV = [["Non-Farm Employment Change", "USD"], ["CPI m/m", "USD"], ["ECB Main Refinancing Rate", "EUR"],
           ["BOE Official Bank Rate", "GBP"], ["Unemployment Rate", "USD"], ["BOJ Policy Rate", "JPY"]]
NEWS_SPECS = [[4, "critical", 12, 5420, 0, 3.2, 4, "XAUUSD +5,210, EURUSD +210", "pending"], [38, "warn", 7, 1380, 0, 1.5, 3, "XAUUSD +1,380", "pending"],
              [95, "warn", 3, 1105, 0, 0.8, 2, "XAUUSD +1,105", "pending"], [190, "warn", 21, 1840, 1, 2.0, 5, "EURUSD +1,260, GBPUSD +580", "sent"],
              [260, "info", 0, 0, 1, 0, 0, "", "none"], [1480, "critical", 9, 6210, 2, 4.1, 6, "EURUSD +4,100, EURGBP +2,110", "sent"],
              [1560, "warn", 14, 1520, 2, 1.2, 2, "EURUSD +1,520", "sent"], [2950, "warn", 5, 1210, 3, 1.0, 3, "GBPUSD +1,210", "sent"],
              [4335, "critical", 18, 5980, 4, 2.6, 4, "XAUUSD +5,000, USDJPY +980", "sent"], [4365, "warn", 2, 1075, 4, 0.6, 2, "XAUUSD +1,075", "sent"],
              [8645, "warn", 30, 1330, 5, 1.1, 2, "USDJPY +1,330", "sent"], [13160, "critical", 11, 7050, 0, 5.0, 8, "XAUUSD +6,900, TECH100 +150", "sent"],
              [17310, "warn", 25, 1160, 1, 0.9, 2, "EURUSD +1,160", "none"], [21690, "warn", 8, 1290, 3, 1.4, 3, "GBPUSD +1,290", "none"],
              [30250, "info", 0, 0, 5, 0, 0, "", "none"], [40375, "critical", 16, 5600, 2, 3.0, 5, "EURUSD +5,600", "none"]]
alerts = []
def alert(mins, sev, login, title, detail, kind, wa="none", extra=None):
    alerts.append({"minutesAgo": mins, "severity": sev, "login": login, "title": title, "detail": detail, "kind": kind, "wa": wa} | (extra or {}))
for m, sev, acc, net, ev, lots, trades, syms, wa in NEWS_SPECS:
    name, cur = NEWS_EV[ev]
    if sev == "info":
        alert(m, "info", None, "News profit, no account above threshold", f"{name} ({cur}), 0 accounts above $1,000", "news", wa)
    else:
        alert(m, sev, 99000000 + acc, f"News profit +${net:,}", f"{name} ({cur}) · {syms} · {lots} lots, {trades} trades", "news", wa)
dg = out["digest"]["sections"] if "digest" in out else load("morning_digest")["sections"]
for i, x in enumerate(dg.get("tier_moves", [])):
    worse = x["direction"] == "worse"
    alert(41 + i * 37, "warn" if worse else "info", x["login"], f"Moved to a {'worse' if worse else 'better'} tier",
          f"{x['pg_before']} to {x['pg_now']}, {x['tier_before']} to {x['tier_now']}", "tier")
for i, x in enumerate(dg.get("floating_swing", [])):
    alert(66 + i * 29, "warn", x["login"], "Floating P&L swing", f"{'+' if x['fpl_delta'] >= 0 else '-'}${abs(x['fpl_delta']):,.0f} since the prior snapshot, now {'-' if x['fpl_now'] < 0 else ''}${abs(x['fpl_now']):,.0f}", "swing")
for i, x in enumerate(dg.get("exposure_up", [])):
    alert(118 + i * 23, "warn", x["login"], "Client profit up", f"30 day P&L {'-' if x['t30_before'] < 0 else ''}${abs(x['t30_before']):,.0f} to {'-' if x['t30_now'] < 0 else ''}${abs(x['t30_now']):,.0f}", "swing")
for i, x in enumerate(dg.get("new_flagged", [])):
    alert(95 + i * 31, "info", x["login"], "New flagged account", f"Tier {x['pg']}, {x['tier']}, balance ${x['balance']:,.0f}", "book")
for i, x in enumerate(dg.get("left_book", [])):
    alert(140 + i * 33, "info", x["login"], "Left the flagged book", f"Was {x['pg']}, back to the normal group", "book")
ALGO = {"mg": "MachineGun", "fbu": "FBUv2", "scalper": "ScalperAM", "etl": "Equity traffic light"}
for x in out["catches"]:
    if x["day"] == 0 and x["algo"] in ALGO and x["seen_ago_min"] is not None:
        frm = (x["from_group"] or "").split("\\")[-1]; to = (x["to_group"] or "").split("\\")[-1]
        alert(x["seen_ago_min"], "warn" if x["algo"] in ("mg", "fbu") else "info", 99000000 + x["acc"], f"{ALGO[x['algo']]} move",
              x["reason"] or f"{frm} to {to}", "algo")
for i, r in enumerate([r for r in out["withdrawals"]["rows"] if r["status"] == "pending"]):
    alert(12 + i * 47, "warn", r["ta_id"], "Withdrawal pending", f"${r['amount']:,.2f} · {r['request_id']} · {(r.get('reason_code') or 'manual review').replace('_', ' ').lower()}", "wd")
alerts.sort(key=lambda a: a["minutesAgo"])
for i, a in enumerate(alerts):
    a["id"] = i + 1
    a["unread"] = i < 9
out["alerts"] = alerts

# ---- History behind the summary figures (owner 2026-11-20, "give dummy of historical at any given moment") ----
# 90 seeded days per figure, the last day equal to today's figure on screen, weekends quieter. Each entry holds one or
# more measures (count, amount, time), breakdowns that add up to the count, and the day's hours in WIB.
def build_history():
    import datetime, random
    end = datetime.datetime.fromtimestamp(AS_OF, datetime.timezone(datetime.timedelta(hours=7))).date()
    days = [end - datetime.timedelta(days=89 - i) for i in range(90)]
    wkend = [d.weekday() >= 5 for d in days]

    def walk(seed, base, vol=0.3, quiet=0.3, last=None, integer=True, floor=0):
        rng = random.Random(seed)
        lv, out_ = base, []
        for i in range(90):
            lv += (base - lv) * 0.18 + rng.gauss(0, base * vol * 0.25)
            v = max(floor, lv * (quiet if wkend[i] else 1) * (1 + rng.gauss(0, vol * 0.45)))
            out_.append(round(v) if integer else round(v, 1))
        if last is not None:
            out_[-1] = last
        return out_

    def split(seed, totals, labels, weights):
        rng = random.Random(seed)
        items = [[0] * 90 for _ in labels]
        for i, t in enumerate(totals):
            w = [x * (0.6 + rng.random() * 0.8) for x in weights]
            for _ in range(int(t)):
                items[rng.choices(range(len(labels)), w)[0]][i] += 1
        return [{"label": l, "values": v} for l, v in zip(labels, items)]

    def amounts(seed, counts, mean):
        rng = random.Random(seed)
        return [round(sum(rng.lognormvariate(0, 0.9) * mean * 0.67 for _ in range(int(c)))) for c in counts]

    def hours(seed, total, shape):
        rng = random.Random(seed)
        h = [0] * 24
        for _ in range(total):
            h[rng.choices(range(24), shape)[0]] += 1
        return h

    desk = [0.3, 0.2, 0.2, 0.2, 0.3, 0.6, 1.2, 2.2, 3.4, 4.0, 3.6, 3.0, 2.4, 2.8, 3.4, 3.6, 3.2, 2.6, 2.4, 2.8, 3.0, 2.6, 1.6, 0.8]
    market = [1.2, 1.0, 0.8, 0.7, 0.8, 1.0, 1.4, 1.8, 2.2, 2.4, 2.2, 2.0, 1.8, 2.0, 2.6, 3.2, 3.6, 3.4, 3.0, 3.6, 4.0, 3.4, 2.4, 1.6]
    rows = wd["rows"]
    now = {s: [r for r in rows if r.get("status") == s] for s in ("pending", "auto", "approved", "rejected")}
    reasons = ["History flag", "Live flag", "Shared IP peer", "Family index stale", "Failsafe timeout", "History unavailable"]
    rw = [5, 3, 1.4, 1, 0.8, 0.6]
    bands = ["Under $500", "$500 to $2k", "$2k to $10k", "Over $10k"]
    by = ["demo.editor", "demo.admin", "demo.risk2"]
    h = {}

    def wd_entry(key, title, n_now, base, mean, with_time, br):
        c = walk(f"wd-{key}", base, last=n_now)
        e = {"title": title, "measures": [{"k": "Requests", "unit": "n", "agg": "sum", "values": c},
                                          {"k": "Amount", "unit": "usd", "agg": "sum", "values": amounts(f"wd-{key}-a", c, mean)}]}
        if with_time:
            e["measures"].append({"k": "Time to decision", "unit": "min", "agg": "avg", "values": walk(f"wd-{key}-t", with_time, vol=0.35, quiet=1, integer=False, floor=1)})
        e["breakdowns"] = br(c)
        e["hours"] = hours(f"wd-{key}-h", int(sum(c[-30:])), desk)
        return e

    h["wd.pending"] = wd_entry("pending", "Pending", len(now["pending"]), 4, 820, 0, lambda c: [{"title": "Reason", "items": split("wd-p-r", c, reasons, rw)}])
    h["wd.pending"]["measures"][0]["agg"] = "last"
    h["wd.pending"]["measures"].append({"k": "Oldest wait", "unit": "min", "agg": "avg", "values": walk("wd-p-w", 22, vol=0.5, quiet=1.4, integer=True, floor=2, last=max(round(r.get("elapsed_ms", 0) / 60000) for r in now["pending"]) or 9)})
    h["wd.auto"] = wd_entry("auto", "Auto", len(now["auto"]), 9, 640, 0, lambda c: [{"title": "Amount band", "items": split("wd-a-b", c, bands, [5, 3.5, 1.2, 0.2])}])
    h["wd.auto"]["measures"].append({"k": "Screen time", "unit": "s", "agg": "avg", "values": walk("wd-a-s", 1.4, vol=0.3, quiet=1, integer=False, floor=0.4)})
    for key, title, base, mean, t in (("approved", "Approved", 4, 1100, 16), ("rejected", "Rejected", 1.6, 2300, 24)):
        h[f"wd.{key}"] = wd_entry(key, title, len(now[key]), base, mean, t, lambda c, key=key: [
            {"title": "Reason", "items": split(f"wd-{key}-r", c, reasons, rw if key == "approved" else [4, 4, 2.4, 0.6, 0.3, 1.4])},
            {"title": "Decided by", "items": split(f"wd-{key}-u", c, by, [5, 3, 2])}])

    # Catches by algorithm, today's count from the catch log
    groups = ["To Std", "To VIP1", "To MVIP", "To watch group"]
    for algo, title, base in (("mg", "MachineGun", 3), ("scalper", "ScalperAM", 2), ("fbu", "Force Build-Up", 1.4), ("etl", "ETL", 2.4)):
        n = sum(1 for x in out["catches"] if x["algo"] == algo and x["day"] == 0)
        c = walk(f"ca-{algo}", base, vol=0.45, quiet=0.15, last=n)
        h[f"catch.{algo}"] = {"title": title, "measures": [{"k": "Catches", "unit": "n", "agg": "sum", "values": c},
            {"k": "Client profit stopped", "unit": "usd", "agg": "sum", "values": amounts(f"ca-{algo}-p", c, 1900)}],
            "breakdowns": [{"title": "Moved", "items": split(f"ca-{algo}-g", c, groups, [4, 2, 1, 1.5])}],
            "hours": hours(f"ca-{algo}-h", int(sum(c[-30:])), market)}

    # Open Lots, end of day books
    t = out["openlots"]["totals"]
    syms = ["XAUUSD", "EURUSD", "GBPUSD", "USDJPY", "TECH100", "Other"]
    for key, title, now_v, integer, unit in (("clients", "Clients", t["clients"], True, "n"), ("positions", "Positions", t["positions"], True, "n"),
                                             ("gross", "Gross lots", round(t["gross_lots"], 1), False, "lots"), ("mg", "MG hits", t["mg_triggered"], True, "n")):
        v = walk(f"ol-{key}", now_v * 0.9 + 1, vol=0.25, quiet=0.2 if key == "mg" else 0.55, last=now_v, integer=integer)
        e = {"title": title, "measures": [{"k": title, "unit": unit, "agg": "sum" if key == "mg" else "avg", "values": v}]}
        if key in ("positions", "mg"):
            e["breakdowns"] = [{"title": "Symbol", "items": split(f"ol-{key}-s", [round(x) for x in v], syms, [5, 3, 2, 2, 1.2, 1.5])}]
        h[f"openlots.{key}"] = e

    # CLTL, symbols on each level at the close
    sy = [s["symbol"] for s in out["cltl"]["symbols"]] if "symbols" in out["cltl"] else []
    for key, title, rx in (("red", "Red", "RED"), ("orange", "Orange", "ORANGE")):
        n = sum(1 for s in out["cltl"].get("symbols", []) if rx in (s.get("effective_level") or ""))
        v = walk(f"cl-{key}", max(n, 1.5), vol=0.5, quiet=0.4, last=n)
        h[f"cltl.{key}"] = {"title": title, "measures": [{"k": "Symbols", "unit": "n", "agg": "avg", "values": v},
            {"k": "Minutes on level", "unit": "min", "agg": "sum", "values": [round(x * 38 * (0.5 + random.Random(f"cl{key}{i}").random())) for i, x in enumerate(v)]}],
            "breakdowns": [{"title": "Symbol", "items": split(f"cl-{key}-s", v, sy[:8], [8, 6, 5, 4, 3, 2, 2, 1][:len(sy[:8])])}] if sy else []}
    return {"days": [d.isoformat() for d in days], "series": h}

out["history"] = build_history()

total = 0
for name, data in out.items():
    size = save(name, data)
    total += size
    print(f"{name:14} {size / 1024:7.1f} kB")
print(f"{'total':14} {total / 1024:7.1f} kB")

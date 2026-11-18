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
sg, beh, win, ex = cp["signals"], cp["behaviour"], cp["windows"], cp["exec_summary"]
sym_pl = {r["symbol"]: r for r in sg["symbol_pl"]["rows"]}
out["client360"] = {
    "login": c3["login"], "as_of": win["as_of"],
    "identity": pick(cp["identity"], "group", "group_tier", "country", "leverage", "registration", "last_access",
                     "balance", "equity", "margin_free", "credit"),
    "classification": cp["classification"]["label"], "risk_level": cp["risk_level"],
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
    "behaviour": {k: r2(beh[k]) for k in ("trade_count", "closed_trade_count", "active_days", "win_rate_pct", "profit_factor",
                                         "avg_win", "avg_loss", "median_hold_label", "overnight_pct", "total_lots", "avg_lot", "max_lot")},
    # one row per trading day, client view and broker (HPOV) view
    "daily": [[p["day"], r2(p["daily"])] for p in cp["realized"]["pl_timeline"]],
    "daily_hpov": [[p["day"], r2(p["daily"])] for p in cp["realized_hpov"]["pl_timeline"]],
    "stats": cp["realized"]["stats"], "stats_hpov": cp["realized_hpov"]["stats"],
    "sessions": sg["sessions"],
    "symbols": [{"symbol": s["symbol"], "pct": s["pct"], "lots": s["lots"],
                 "pl": sym_pl.get(s["symbol"], {}).get("net_pl"), "hpov": sym_pl.get(s["symbol"], {}).get("hpov_pl"),
                 "trades": sym_pl.get(s["symbol"], {}).get("trades"), "win": sym_pl.get(s["symbol"], {}).get("win_rate")}
                for s in beh["symbol_concentration"]],
    "holding": sg["holding_pl"]["buckets"],
    "windows": {**pick(win, "t_all", "t180", "t30", "fpl", "t_all_net", "t_all_commission", "t_all_swap",
                       "lifetime_deposits", "lifetime_withdrawals"), "hpov": win["hpov"],
                "fpl_check": pick(win["fpl_reconciliation"], "account_fpl", "position_floating", "difference", "status")},
    "exposure": {"symbols": cp["exposure"]["symbols"], "totals": cp["exposure"]["totals"]},
    "group_changes": [pick(c, "day", "from_tier", "to_tier", "source") for c in cp["group_timeline"]["changes"]],
    "etl": [pick(e, "time_wib", "kind", "from_tier", "to_tier", "tpl") for e in cp["etl_log"]["events"]],
    "withdrawals": cp["withdrawal_velocity"],
}

# ---- Admin: users, devices, build paths ----
out["users"] = load("users")
out["buildpaths"] = load("build_paths")

total = 0
for name, data in out.items():
    size = save(name, data)
    total += size
    print(f"{name:14} {size / 1024:7.1f} kB")
print(f"{'total':14} {total / 1024:7.1f} kB")

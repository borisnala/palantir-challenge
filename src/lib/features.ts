// The index behind the menu's search (owner 2026-11-19, "the search in the menu is for features, not Client 360"):
// every screen, every tab or view inside a screen, and every setting, with the words a desk user would type for it.
// A result opens the screen, or Settings for a setting. Client lookups stay in Client 360.

export type Feature = { title: string; where: string; href?: string; settings?: true | string; words: string };

const S = (title: string, where: string, href: string, words = ""): Feature => ({ title, where, href, words });
const T = (title: string, where: string, words = "", page?: string): Feature => ({ title, where, settings: page ?? true, words });

export const FEATURES: Feature[] = [
  // Today
  S("Morning Digest", "Today", "/", "home today overnight summary flagged book profit change moves"),
  S("Largest moves", "Morning Digest", "/", "movement worse tier better tier entered left floating swing profit up"),
  S("Action required", "Morning Digest", "/", "pending withdrawals unread alerts tasks"),
  S("Notifications", "Bell", "/alerts/", "alerts bell unread critical warning info news profit"),

  // Risk
  S("Risk Management", "Risk", "/risk/", "risk section monitoring algorithms"),
  S("Watchlist", "Risk", "/risk/watchlist/", "watched accounts desk monitoring t30 floating balance"),
  S("Open Lots", "Risk", "/risk/open-lots/", "open positions gross lots floating exposure machinegun hits live"),
  S("Growth Detection", "Risk", "/risk/growth/", "consistent profit curve fit linear growth"),
  S("Top 10", "Risk", "/risk/top10/", "winners losers volume groups ranking a book b book"),
  S("Catches", "Risk", "/risk/catches/", "detections group moves today promote demote auto direct"),
  S("News", "Risk", "/risk/news/", "economic releases calendar nfp cpi fomc news trading"),
  S("Risk Analysis", "Risk", "/risk/analysis/", "machinegun scalperam fbuv2 force build up detections tiers transitions"),
  S("MachineGun", "Risk Analysis", "/risk/analysis/", "mg burst high lot orders trigger margin tiers"),
  S("ScalperAM", "Risk Analysis", "/risk/analysis/", "scalper fast trades holding time"),
  S("Force Build-Up", "Risk Analysis", "/risk/analysis/", "fbu fbuv2 build up exposure deposit"),
  S("Algo behaviour", "Risk Analysis", "/risk/analysis/", "before during after cumulative protection tiers"),
  S("Algo protection", "Risk Analysis", "/risk/analysis/", "protection spread markup house p&l"),
  S("Algo Activity", "Risk", "/risk/activity/", "algorithm moves risk score window"),
  S("CRA Model", "Risk", "/risk/cra-model/", "customer risk assessment thresholds weights region profile product channel tppu tppt"),
  S("Try a customer", "CRA Model", "/risk/cra-model/", "score customer test rating trial"),
  S("CRA sign-off", "CRA Model", "/risk/cra-model/", "sign off approve version maker checker shadow enforce mode restore"),
  S("CRA Analysis", "Risk", "/risk/cra-analysis/", "customer risk assessments audit chain edd high medium low"),
  S("Promotion Analysis", "Risk", "/risk/promotion/", "jamesbond promo promoted rolled back expiry"),
  S("HouseCleaning", "Risk", "/risk/housecleaning/", "groups cutlist reinstate archive delete empty"),

  // Liquidity
  S("Liquidity Management", "Liquidity", "/liquidity/", "liquidity section spreads control"),
  S("CLTL · LPTL", "Liquidity", "/liquidity/cltl/", "candle liquidity traffic light spread level red orange yellow"),
  S("PG Markups", "Liquidity", "/liquidity/pg-markups/", "spread markup price group points ib rebate bands"),
  S("Manual Level", "Liquidity", "/liquidity/manual-level/", "spread limits traffic light level symbol price feed"),
  S("Symbol toxicity", "Book View", "/liquidity/book/", "toxic symbols loss share activity lift b-book"),
  S("Cost per $1m notional", "Book View", "/liquidity/book/", "pnl per million notional cost clients"),
  S("Closed lots", "Open Lots", "/risk/open-lots/", "history edge map behaviour map quadrant scalper machinegun"),
  S("Group Spread", "Liquidity", "/liquidity/group-spread/", "spread tier mt5 group mispriced"),
  S("Book View", "Liquidity", "/liquidity/book/", "flagged book exposure loss price group symbols hours heatmap"),

  // Withdrawals
  S("WD Approvals", "Withdrawals", "/withdrawals/", "withdrawal queue pending approve reject decided auto payout"),
  S("WD Check", "Withdrawals", "/withdrawals/check/", "pre screen account withdrawal check family index"),
  S("System health", "Withdrawals", "/withdrawals/health/", "screener checks status down warnings feeds"),

  // Clients
  S("Client 360", "Clients", "/search/", "client search login name group profile"),

  // Account
  T("Users and roles", "Settings", "users roles viewer editor admin permissions new user create reset password", "users"),
  T("Device access", "Settings", "devices approve deny tablet phone laptop", "devices"),

  // Settings
  T("Settings", "Settings", "preferences options"),
  T("Switch user", "Settings", "sign in another user account"),
  T("Clearance level", "Settings", "role permissions viewer editor admin access"),
  T("Activity", "Settings", "session log actions history"),
  T("Notification kinds", "Settings", "alerts mute bell filter"),
  T("Start screen", "Settings", "launch open first page default"),
  T("Point of view", "Settings", "client p&l broker p&l hpov"),
  T("Live prices", "Settings", "feed ticks simulated pause"),
  T("Haptic feedback", "Settings", "vibration haptics"),
  T("Appearance", "Settings", "theme dark light mode system"),
  T("Sign out", "Settings", "log out logout"),
  T("About this demo", "Settings", "palantir challenge boris nala demonstration data what is this"),
  T("Add to Home Screen", "Settings", "install app home screen iphone android pwa"),
  S("Sign in", "Account", "/login/", "login log in password view only"),
  S("Request access", "Account", "/access/", "device access approval new device"),
];

/** Ranked matches: a title that starts with the query first, then a word in the title, then the keywords. */
export function findFeatures(q: string): Feature[] {
  const terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const score = (f: Feature) => {
    const t = f.title.toLowerCase(), all = `${t} ${f.where.toLowerCase()} ${f.words}`;
    if (!terms.every((w) => all.includes(w))) return 0;
    if (t.startsWith(terms.join(" "))) return 3;
    if (terms.every((w) => t.split(/[\s·-]+/).some((x) => x.startsWith(w)))) return 2;
    return 1;
  };
  return FEATURES.map((f) => [f, score(f)] as const).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).map(([f]) => f);
}

// Dummy data only. Logins 99000001.., names "Demo Client N", groups under DUMMY\.
// Mirrors the desktop portal's frontend demo so both tell the same story.

export type Tier = "F1" | "F3" | "F5";
export type Status = "watch" | "escalated" | "cleared";

export interface Client {
  login: number;
  name: string;
  country: string;
  group: string;
  tier: Tier;
  style: string;
  risk: "low" | "medium" | "high";
  balance: number;
  equity: number;
  t180: number;
  t30: number;
  fpl: number;
  winRate: number;
  profitFactor: number | null; // null = no losing trades
  lastTrade: string;
  status?: Status;
  note?: string;
  why?: string;
  exposure: { symbol: string; side: "Buy" | "Sell"; lots: number; net: number; fpl: number }[];
  pnl30: number[]; // daily client P&L, oldest first
}

export interface Withdrawal {
  id: string;
  login: number;
  amount: number;
  requested: string;
  headline: string;
  reasons: { code: string; text: string; level: "flag" | "info" }[];
}

export interface Alert {
  id: number;
  minutesAgo: number;
  severity: "critical" | "warn" | "info";
  login: number;
  title: string;
  detail: string;
  unread: boolean;
}

export interface NewsEvent {
  title: string;
  currency: string;
  impact: "high" | "medium";
  inMinutes: number;
  exposed: number; // accounts holding the currency now
}

function series(seed: number, drift: number): number[] {
  let x = seed;
  const out: number[] = [];
  for (let i = 0; i < 30; i++) {
    x = (x * 9301 + 49297) % 233280;
    out.push(Math.round(((x / 233280) - 0.5) * 900 + drift));
  }
  return out;
}

export const CLIENTS: Client[] = [
  { login: 99000001, name: "Demo Client 1", country: "Singapore", group: "DUMMY\\Direct\\VIP1", tier: "F1", style: "Intraday trader", risk: "medium",
    balance: 4866.42, equity: 7496.33, t180: 20408.46, t30: 3424.75, fpl: 2629.91, winRate: 54.9, profitFactor: 3.09, lastTrade: "12 Nov",
    status: "watch", note: "Copy trading suspicion", why: "Client profit up",
    exposure: [{ symbol: "XAUUSD", side: "Buy", lots: 2.4, net: 636000, fpl: 1890.2 }, { symbol: "EURUSD", side: "Sell", lots: 3.0, net: -325500, fpl: 739.71 }],
    pnl30: series(11, 110) },
  { login: 99000002, name: "Demo Client 2", country: "Malaysia", group: "DUMMY\\Direct\\Std", tier: "F3", style: "News hunter", risk: "high",
    balance: 33576.09, equity: 32946.69, t180: 35985.2, t30: 7107.98, fpl: -629.4, winRate: 58.6, profitFactor: 3.62, lastTrade: "13 Nov",
    status: "escalated", note: "Sent to the dealing desk", why: "Moved price group and floating P&L swing",
    exposure: [{ symbol: "TECH100", side: "Buy", lots: 1.5, net: 604500, fpl: -629.4 }],
    pnl30: series(23, 240) },
  { login: 99000003, name: "Demo Client 3", country: "Thailand", group: "DUMMY\\Direct\\MVIP", tier: "F1", style: "News hunter", risk: "high",
    balance: 210000, equity: 211315.69, t180: 121877.76, t30: 22333.62, fpl: 1315.69, winRate: 100, profitFactor: null, lastTrade: "13 Nov",
    status: "watch", note: "Trades only around high impact news", why: "Client profit up",
    exposure: [{ symbol: "XAUUSD", side: "Buy", lots: 5.0, net: 1325000, fpl: 1315.69 }],
    pnl30: series(37, 740) },
  { login: 99000004, name: "Demo Client 4", country: "Vietnam", group: "DUMMY\\IB\\Std", tier: "F1", style: "Swing trader", risk: "low",
    balance: 11986.95, equity: 11418.14, t180: -2966.46, t30: -619.39, fpl: -568.81, winRate: 38.9, profitFactor: 0.78, lastTrade: "9 Nov",
    exposure: [{ symbol: "GBPUSD", side: "Buy", lots: 1.0, net: 127000, fpl: -568.81 }],
    pnl30: series(41, -20) },
  { login: 99000008, name: "Demo Client 8", country: "Philippines", group: "DUMMY\\EA\\Std", tier: "F3", style: "Expert advisor", risk: "medium",
    balance: 1799.6, equity: 94.93, t180: 23832.07, t30: 4337.71, fpl: -1704.53, winRate: 56.1, profitFactor: 2.88, lastTrade: "12 Nov",
    exposure: [{ symbol: "USOIL", side: "Sell", lots: 2.0, net: -144000, fpl: -1704.53 }],
    pnl30: series(53, 140) },
  { login: 99000010, name: "Demo Client 10", country: "Indonesia", group: "DUMMY\\Direct\\Premium", tier: "F5", style: "Scalper", risk: "medium",
    balance: 74000, equity: 74945.2, t180: 29464.17, t30: 6769.27, fpl: 945.2, winRate: 56.3, profitFactor: 2.47, lastTrade: "13 Nov",
    exposure: [{ symbol: "NAS100", side: "Buy", lots: 3.0, net: 1212000, fpl: 945.2 }],
    pnl30: series(67, 220) },
  { login: 99000011, name: "Demo Client 11", country: "Singapore", group: "DUMMY\\Direct\\VIP1", tier: "F3", style: "Scalper", risk: "medium",
    balance: 88538.41, equity: 88631.15, t180: 13344.56, t30: 904.08, fpl: 92.74, winRate: 50.4, profitFactor: 1.93, lastTrade: "12 Nov",
    why: "New flagged account",
    exposure: [{ symbol: "EURUSD", side: "Buy", lots: 4.0, net: 434000, fpl: 92.74 }],
    pnl30: series(71, 30) },
  { login: 99000012, name: "Demo Client 12", country: "UAE", group: "DUMMY\\Direct\\MVIP", tier: "F1", style: "News hunter", risk: "high",
    balance: 63018.56, equity: 63272.34, t180: 658.39, t30: -1117.84, fpl: 253.78, winRate: 48.2, profitFactor: 1.07, lastTrade: "30 Oct",
    why: "New flagged account",
    exposure: [{ symbol: "USDJPY", side: "Sell", lots: 2.0, net: -200000, fpl: 253.78 }],
    pnl30: series(79, -40) },
  { login: 99000013, name: "Demo Client 13", country: "United Kingdom", group: "DUMMY\\Direct\\Std", tier: "F1", style: "Intraday trader", risk: "low",
    balance: 15792.85, equity: 16150.9, t180: 7238.99, t30: -857.39, fpl: 358.05, winRate: 41.6, profitFactor: 0.8, lastTrade: "11 Nov",
    status: "cleared", note: "Back to the normal group", why: "Left the flagged book",
    exposure: [{ symbol: "DE40", side: "Buy", lots: 0.5, net: 242500, fpl: 358.05 }],
    pnl30: series(83, -25) },
];

export const DIGEST = {
  since: "12 Nov, 06:57 UTC",
  headline:
    "2 new flagged accounts, 3 left the book, 2 moved to a worse tier and 4 have client profit up. Client profit on the flagged book is up $10,925 since 12 Nov.",
  flagged: 12,
  flaggedChange: -1,
  clientPnl30: 42824.23,
  clientPnl30Change: 10925.42,
  floating: 2595.64,
  floatingChange: 1793.04,
  moves: [
    { login: 99000002, from: "F1", to: "F3", worse: true },
    { login: 99000004, from: "F3", to: "F1", worse: false },
    { login: 99000010, from: "F3", to: "F5", worse: true },
  ],
};

export const WITHDRAWALS: Withdrawal[] = [
  { id: "wd-121", login: 99000121, amount: 2200, requested: "15:58", headline: "Scalper flag and a group move",
    reasons: [
      { code: "SC1", text: "11 fast trades, 64% win rate, +$980. Moved from VIP1 to Std automatically.", level: "flag" },
      { code: "FBU1", text: "Force build up on 5 Nov. Moved from VIP1 to Std.", level: "flag" },
      { code: "HN", text: "House net 0.7 lots XAUUSD on a linked account.", level: "info" },
    ] },
  { id: "wd-114", login: 99000114, amount: 150, requested: "15:41", headline: "Live check timed out",
    reasons: [{ code: "FAIL-SAFE", text: "The live check timed out after 10 seconds. Risk decides by hand.", level: "flag" }] },
  { id: "wd-111", login: 99000111, amount: 300, requested: "15:20", headline: "Live detector hit",
    reasons: [{ code: "MG", text: "MachineGun pattern on XAUUSD in the last hour.", level: "flag" }] },
  { id: "wd-107", login: 99000107, amount: 5400, requested: "14:52", headline: "Large amount for this account",
    reasons: [
      { code: "SIZE", text: "Withdrawal is 82% of the balance.", level: "flag" },
      { code: "NEW", text: "Account opened 9 days ago.", level: "info" },
    ] },
];

export const DECISIONS_TODAY = { auto: 7, manual: 11, failSafe: 2, medianSeconds: 1.1 };

export const ALERTS: Alert[] = [
  { id: 1, minutesAgo: 4, severity: "critical", login: 99000012, title: "News profit +$5,420", detail: "Non-Farm Employment Change (USD)", unread: true },
  { id: 2, minutesAgo: 18, severity: "critical", login: 99000003, title: "News profit +$3,180", detail: "CPI m/m (USD)", unread: true },
  { id: 3, minutesAgo: 41, severity: "warn", login: 99000002, title: "Moved to a worse tier", detail: "F1 to F3", unread: true },
  { id: 4, minutesAgo: 66, severity: "warn", login: 99000008, title: "Floating P&L swing", detail: "-$1,704 on USOIL", unread: true },
  { id: 5, minutesAgo: 95, severity: "info", login: 99000011, title: "New flagged account", detail: "Scalper, tier F3", unread: true },
  { id: 6, minutesAgo: 140, severity: "info", login: 99000013, title: "Left the flagged book", detail: "Back to the normal group", unread: false },
  { id: 7, minutesAgo: 210, severity: "warn", login: 99000010, title: "Moved to a worse tier", detail: "F3 to F5", unread: false },
];

export const NEWS: NewsEvent[] = [
  { title: "Non-Farm Employment Change", currency: "USD", impact: "high", inMinutes: 35, exposed: 6 },
  { title: "ECB Main Refinancing Rate", currency: "EUR", impact: "high", inMinutes: 150, exposed: 3 },
  { title: "Crude Oil Inventories", currency: "USD", impact: "medium", inMinutes: 310, exposed: 1 },
];

export const findClient = (login: number) => CLIENTS.find((c) => c.login === login);

export const money = (v: number, sign = false) => {
  const s = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (!sign) return (v < 0 ? "-$" : "$") + s;
  return (v < 0 ? "-$" : "+$") + s;
};

export const compact = (v: number, sign = false) => {
  const a = Math.abs(v);
  if (a >= 1e6) return (v < 0 ? "-$" : sign ? "+$" : "$") + (a / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
  const s = a >= 1000 ? (a / 1000).toFixed(a >= 100000 ? 0 : 1).replace(/\.0$/, "") + "k" : a.toFixed(0);
  return (v < 0 ? "-$" : sign ? "+$" : "$") + s;
};

export const ago = (m: number) => (m < 60 ? `${m} min ago` : `${Math.floor(m / 60)} h ago`);

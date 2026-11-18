// Serves https://lab.borisnala.com/risktool-prototype/ from the risk-desk Pages project. Bound only to that path
// (router/wrangler.toml), so the rest of the lab is never touched and needs no redeploy.
const RISK = "risk-desk.pages.dev";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.hostname = RISK;
    const headers = new Headers(request.headers);
    headers.delete("host");
    const res = await fetch(url.toString(), { method: request.method, headers, body: request.body, redirect: "manual" });
    const out = new Response(res.body, res);
    out.headers.set("X-Robots-Tag", "noindex, nofollow");
    const loc = out.headers.get("Location");
    if (loc && loc.includes(RISK)) out.headers.set("Location", loc.replace(`https://${RISK}`, ""));
    return out;
  },
};

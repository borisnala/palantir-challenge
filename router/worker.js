// Serves https://lab.borisnala.com/risktool-prototype/ by itself: the whole static build is packed into site.js.
// Bound only to that path (wrangler.toml), so the rest of the lab is never touched.
import SITE from "./site.js";

const PREFIX = "/risktool-prototype";
// Screens that moved in later builds. Bookmarks, Home Screen icons and old history entries still point at them.
const MOVED = { "/approvals/": "/withdrawals/", "/clients/": "/search/", "/today/": "/", "/account/": "/", "/account/users/": "/", "/account/devices/": "/", "/account/build-paths/": "/" };
const bytes = new Map();
const body = (f) => {
  if (!f[1]) return f[2];
  if (!bytes.has(f)) bytes.set(f, Uint8Array.from(atob(f[2]), (c) => c.charCodeAt(0)));
  return bytes.get(f);
};
const send = (f, status = 200, path = "") => new Response(body(f), { status, headers: {
  "content-type": f[0],
  "cache-control": path.startsWith("/_next/static/") ? "public, max-age=31536000, immutable" : "no-cache",
  "x-robots-tag": "noindex, nofollow",
  "x-content-type-options": "nosniff",
} });

const router = {
  async fetch(request) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(PREFIX)) return new Response("Not found", { status: 404 });
    if (url.pathname === PREFIX) return Response.redirect(`${url.origin}${PREFIX}/${url.search}`, 308);
    const p = decodeURIComponent(url.pathname.slice(PREFIX.length)) || "/";
    const moved = MOVED[p.endsWith("/") ? p : `${p}/`];
    if (moved) return Response.redirect(`${url.origin}${PREFIX}${moved}${url.search}`, 301);
    const hit = SITE[p] ?? SITE[p.endsWith("/") ? `${p}index.html` : `${p}/index.html`];
    if (hit) {
      if (!p.endsWith("/") && !SITE[p]) return Response.redirect(`${url.origin}${PREFIX}${p}/${url.search}`, 308);
      return send(hit, 200, p);
    }
    return SITE["/404.html"] ? send(SITE["/404.html"], 404) : new Response("Not found", { status: 404 });
  },
};
export default router;

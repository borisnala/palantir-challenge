// Lets the Settings sheet force Light or Dark (owner 2026-11-19). Every `@media (prefers-color-scheme: dark)` block is
// kept for System, scoped to html without data-theme="light", and copied once more outside the media query, scoped to
// html[data-theme="dark"]. Selectors that start with :root or html are joined onto the scope instead of nested in it.
const scope = (sel, pre) =>
  sel.split(",").map((s) => {
    const t = s.trim();
    if (/^(:root|html)\b/.test(t)) return t.replace(/^(:root|html)/, pre);
    return `${pre} ${t}`;
  }).join(", ");

const plugin = () => ({
  postcssPlugin: "theme-override",
  OnceExit(root) {
    root.walkAtRules("media", (at) => {
      if (!/prefers-color-scheme:\s*dark/.test(at.params) || at.__themed) return;
      at.__themed = true;
      const forced = at.clone();
      at.walkRules((r) => { if (r.parent.type !== "atrule" || r.parent === at) r.selector = scope(r.selector, 'html:not([data-theme="light"])'); });
      forced.walkRules((r) => { r.selector = scope(r.selector, 'html[data-theme="dark"]'); });
      at.after(forced.nodes);
    });
  },
});
plugin.postcss = true;
module.exports = plugin;

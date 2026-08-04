/**
 * preview.js — what the editor shows beside each form.
 *
 * Every renderer here emits the same class names the website itself uses,
 * and `preview.css` is a generated copy of the site's own stylesheet. So
 * the preview is not an approximation of the page: it is the page's markup
 * under the page's CSS. When the design changes, the preview follows on the
 * next build without anyone maintaining it.
 *
 * The renderers below are pure — data in, HTML string out — so they can be
 * checked without running the CMS at all.
 */

/* ── helpers, mirroring the site ────────────────────────────────────── */

const esc = v => String(v ?? "").replace(/[&<>"]/g, c =>
  ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]));

/** His own name is emboldened in author lists, exactly as on the site. */
const emphasise = a => esc(a).replace(/Maheshwari, B\./g, "<b>Maheshwari, B.</b>");

const chip = (t, hot) => `<span class="chip${hot ? " live" : ""}">${esc(t)}</span>`;

/** The Research / Programmes / News entry, as `entryHTML` renders it. */
function entry(e) {
  const hot = e.status === "current" || e.status === "live";
  const title = e.links?.[0]?.href
    ? `<a href="${esc(e.links[0].href)}">${esc(e.name)}</a>` : esc(e.name);
  return `<li class="item">
    <h3>${title}</h3>
    <div class="meta">${chip(e.status || "", hot)}${chip(e.year || "")}</div>
    ${e.blurb ? `<p>${esc(e.blurb)}</p>` : ""}
    ${e.tags?.length ? `<div class="tags">${e.tags.map(t => chip(t)).join("")}</div>` : ""}
    ${e.links?.length ? `<div class="links">${e.links.map(l =>
        `<a href="${esc(l.href)}">${esc(l.label)} &#8599;</a>`).join("")}</div>` : ""}
  </li>`;
}

const list = (items, render) =>
  `<ul class="list">${(items || []).map(render).join("")}</ul>`;

/** A group heading with a count, as both filtered panels render it. */
const group = (label, count, body, emptyMsg) => `
  <section class="group">
    <div class="group-head"><h2>${esc(label)}</h2><span>${count}</span></div>
    ${count ? body : `<p class="group-empty">${esc(emptyMsg || "Nothing here yet.")}</p>`}
  </section>`;

/* ── one renderer per editable file ─────────────────────────────────── */

const publication = p => `
  <article class="pub">
    <p class="t">${p.d ? `<a href="https://doi.org/${esc(p.d)}">${esc(p.t)}</a>` : esc(p.t)}</p>
    ${p.a ? `<p class="a">${emphasise(p.a)}</p>` : ""}
    ${p.v || p.c ? `<p class="v">${esc(p.v || "")}${
      p.c ? `${p.v ? " &middot; " : ""}<i>${p.c} citations</i>` : ""}</p>` : ""}
  </article>`;

const person = p => `
  <article class="person">
    <h3>${p.l?.[0]?.href ? `<a href="${esc(p.l[0].href)}">${esc(p.n)}</a>` : esc(p.n)}</h3>
    ${p.p ? `<span class="pos">${esc(p.p)}</span>` : ""}
    ${p.f ? `<p class="focus">${esc(p.f)}</p>` : ""}
    ${p.w ? `<p class="where">${esc(p.w)}</p>` : ""}
  </article>`;

/** Publications, banded by year the way the page bands them. */
function publicationsView(items) {
  const byYear = new Map();
  for (const p of items || []) {
    const y = p.y || "Undated";
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(p);
  }
  const bands = [...byYear.entries()]
    .sort((a, b) => String(b[0]).localeCompare(String(a[0])))
    .map(([year, ps]) => `<div class="pub-year"><div class="yr">${esc(year)}</div>
       <div>${ps.map(publication).join("")}</div></div>`).join("");
  return group("Publications", (items || []).length, bands);
}

function teamView(items) {
  return group("People", (items || []).length, (items || []).map(person).join(""));
}

const RENDER = {
  publications_list:     d => publicationsView(d.items),
  team_people:           d => teamView(d.items),
  news_items:            d => list(d.items, entry),
  research_themes:       d => list(d.items, entry),
  programmes_list:       d => list(d.items, entry),

  teaching_areas: d => list(d.items, a => `<li class="item">
      <h3>${esc(a.name)}</h3><div class="meta">${chip(a.when || "", true)}</div>
      ${a.blurb ? `<p>${esc(a.blurb)}</p>` : ""}</li>`),

  contact_channels: d => `<div class="contact-links">${(d.items || []).map(c =>
      `<a href="${esc(c.href)}"><strong>${esc(c.label)}</strong><span>${esc(c.detail)}</span></a>`
    ).join("")}</div>`,

  profile_metrics: d => `<div class="metrics">${(d.items || []).map(m =>
      `<div><b>${esc(m.value)}</b><span>${m.label ?? ""}</span></div>`).join("")}</div>`,

  /* Section lists preview as the sections they will produce, including
     the empty state — which is the thing worth seeing before saving. */
  publications_sections: d => (d.items || []).map(k =>
      group(k.label, 0, "", k.empty) + (k.open ? "" : "")).join(""),
  team_sections: d => (d.items || []).map(r => group(r.label, 0, "", r.empty)).join(""),

  site_sections: d => `<nav class="nav" style="display:grid;gap:2px">${(d.items || []).map(s =>
      `<button type="button"><i>${esc(s.tc)}</i><span>${esc(s.label)}</span></button>`).join("")}</nav>
    <p class="group-empty">This is the site's menu, in order. Every page listed here needs a
    panel or a page definition, or its menu entry leads nowhere.</p>`,
};

/* Exposed so the renderers can be exercised without running the CMS —
   they are pure functions, and checking them is the part that matters. */
if (typeof window !== "undefined") window.__previewRenderers = RENDER;

/* ── wiring ─────────────────────────────────────────────────────────── */

(function register() {
  const CMS = window.CMS;
  if (!CMS) return;

  /* The site's own stylesheet, so the preview is styled by the same rules
     the page is. Registered even if the templates below cannot be, since
     it improves the built-in preview on its own. */
  try { CMS.registerPreviewStyle("/basantmaheshwari/admin/preview.css"); }
  catch { try { CMS.registerPreviewStyle("preview.css"); } catch { /* nothing to do */ } }

  if (typeof CMS.registerPreviewTemplate !== "function") return;

  for (const [name, render] of Object.entries(RENDER)) {
    /* Rendered into the preview iframe's own document rather than
       returned as elements: it keeps this file free of React and JSX,
       and the markup is then identical to the site's. The component
       returns null because the DOM writing is the whole job. */
    const Template = function (props) {
      try {
        const doc = props.document || props.window?.document;
        if (!doc || !doc.body) return null;
        const data = props.entry?.toJS?.().data ?? props.entry?.get?.("data")?.toJS?.() ?? {};
        let host = doc.getElementById("cms-preview");
        if (!host) {
          host = doc.createElement("div");
          host.id = "cms-preview";
          host.className = "cms-preview";
          doc.body.appendChild(host);
        }
        host.innerHTML = render(data);
      } catch (e) {
        /* A preview that throws must not take the editor down with it —
           the form still has to be usable. */
        console.warn("preview failed for " + name, e);
      }
      return null;
    };
    try { CMS.registerPreviewTemplate(name, Template); }
    catch (e) { console.warn("could not register preview for " + name, e); }
  }
})();

#!/usr/bin/env node
/**
 * verify.mjs — the gate between an edit and the public site.
 *
 * This repository has no build step, so there is no compiler to catch a
 * mistake before it is published. This script is that compiler. It runs
 * in CI before the site is packaged, and refuses the deploy if the page
 * would be broken or would stop being self-contained.
 *
 * It has no dependencies. Run it with:
 *
 *     node checks/verify.mjs
 *
 * Two severities, and the distinction is deliberate:
 *
 *   ERROR — the published page would be broken, wrong, or would fetch
 *           from a third party. Blocks the deploy.
 *   WARN  — worth a human's attention, but shipping it is not a failure.
 *           Printed and ignored.
 *
 * The rule of thumb when adding a check: block only what you could point
 * at on the live site and call a defect. A non-technical editor filing an
 * issue should never be stopped by a matter of taste.
 */

import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "index.html");

const errors = [];
const warnings = [];
const fail = m => errors.push(m);
const warn = m => warnings.push(m);

let html;
try {
  html = readFileSync(FILE, "utf8");
} catch {
  console.error("FATAL  index.html not found at " + FILE);
  process.exit(1);
}

/* ── 1. The file must stay self-contained ──────────────────────────────
   The whole architecture rests on this: one file, openable offline, no
   third party able to see who reads the page. An agent editing the site
   will reach for a CDN font or an icon library by reflex, so this is the
   check that matters most. Anchors (<a href="https://…">) are fine — a
   link is not a resource the browser fetches on load. */
const LOADED_ATTR = /<(?!a\b)([a-z-]+)\b[^>]*?\s(?:src|href)\s*=\s*["'](https?:)?\/\/[^"']+["']/gi;
for (const m of html.matchAll(LOADED_ATTR)) {
  fail(`external resource loaded by <${m[1]}>: ${m[0].slice(0, 110)}`);
}
if (/@import\s+(url\()?["']?https?:/i.test(html)) fail("CSS @import of a remote stylesheet");
if (/<script[^>]+\ssrc\s*=/i.test(html)) fail("<script src=…> — all script must be inline");
if (/<link[^>]+rel=["']?stylesheet/i.test(html)) fail("<link rel=stylesheet> — all style must be inline");

/* ── 2. No duplicate ids ───────────────────────────────────────────────
   getElementById returns the first match in document order, so a
   duplicate id does not throw — it silently wires a script to the wrong
   element. This has already happened once on this page. */
const ids = new Map();
for (const m of html.matchAll(/\sid\s*=\s*["']([^"']+)["']/g)) {
  ids.set(m[1], (ids.get(m[1]) || 0) + 1);
}
for (const [id, n] of ids) if (n > 1) fail(`duplicate id "${id}" appears ${n} times`);

/* ── 3. The content arrays must parse ──────────────────────────────────
   Extract each array literal by bracket matching and evaluate it in a
   throwaway context. They are pure data, so this is both safe and the
   only honest way to know a trailing comma or unbalanced quote has not
   been introduced by hand. */
function extractArray(name) {
  const start = html.indexOf(`const ${name} = [`);
  if (start === -1) return null;
  const open = html.indexOf("[", start);
  let depth = 0, inStr = null, esc = false;
  for (let i = open; i < html.length; i++) {
    const c = html[i];
    if (esc) { esc = false; continue; }
    if (inStr) {
      if (c === "\\") esc = true;
      else if (c === inStr) inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { inStr = c; continue; }
    if (c === "[") depth++;
    else if (c === "]") { depth--; if (depth === 0) return html.slice(open, i + 1); }
  }
  return null;
}

const ARRAYS = ["SECTIONS", "METRICS", "RESEARCH", "PROGRAMS", "TEACHING", "NEWS", "CONTACT",
  "TEAM_ROLES", "TEAM", "PUB_KINDS", "PUBLICATIONS"];
const data = {};
for (const name of ARRAYS) {
  const src = extractArray(name);
  if (src === null) { fail(`content array ${name} not found`); continue; }
  try {
    data[name] = vm.runInNewContext(`(${src})`, Object.create(null), {timeout: 2000});
  } catch (e) {
    fail(`content array ${name} does not parse: ${e.message}`);
  }
}

/* ── 4. Navigation and panels must agree ───────────────────────────────
   The rail, the mobile menu and the panel engine all build from
   SECTIONS. A section without a matching panel renders a nav entry that
   navigates to a blank page. */
for (const s of data.SECTIONS || []) {
  if (!s.id || !s.label) { fail(`SECTIONS entry missing id or label: ${JSON.stringify(s)}`); continue; }
  /* A section needs somewhere to land: either a panel written into the
     markup, or a `page` object that generatePages() builds one from.
     With neither, the rail shows an entry that navigates to a blank
     screen — the nav still highlights, the hash still changes, and
     nothing anywhere throws. */
  const hasPanel = html.includes(`data-panel="${s.id}"`);
  if (!hasPanel && !s.page) {
    fail(`section "${s.id}" has neither a <section data-panel="${s.id}"> nor a page:{…} ` +
         `definition — its nav entry would lead to a blank screen`);
  }
  if (s.page) {
    if (!Array.isArray(s.page.blocks)) warn(`section "${s.id}" has a page with no blocks array`);
    for (const b of s.page.blocks || []) {
      if (!b.paragraphs && !b.entries) {
        fail(`section "${s.id}" has a page block with neither paragraphs nor entries — it would render empty`);
      }
    }
  }
}
/* Only ids written literally into the markup count. The script also
   contains `data-panel="${s.id}"` inside a querySelector template, and
   reading that as a real panel is how this check reported a phantom. */
const panelIds = [...html.matchAll(/data-panel="([^"]+)"/g)]
  .map(m => m[1]).filter(id => !id.includes("${"));
for (const id of panelIds) {
  if (!(data.SECTIONS || []).some(s => s.id === id)) {
    warn(`panel "${id}" exists but is not listed in SECTIONS, so nothing links to it`);
  }
}

/* ── 5. Publications ───────────────────────────────────────────────────
   A DOI is optional — some older records genuinely do not have one, and
   those are listed without a link on purpose. But a DOI that is present
   and wrong becomes a 404 with this site's name on it, so the *format*
   is enforced whenever there is one.

   The kind is enforced strictly: an entry whose `k` is not a declared
   PUB_KINDS id renders into no section at all and silently disappears
   from the page, which is exactly the sort of failure nobody notices. */
const KIND_IDS = new Set((data.PUB_KINDS || []).map(k => k.id));
if (!KIND_IDS.size) fail("PUB_KINDS is empty — publications would have nowhere to render");
for (const k of data.PUB_KINDS || []) {
  if (!k.id || !k.label) fail(`PUB_KINDS entry missing id or label: ${JSON.stringify(k)}`);
  if (!k.empty) warn(`PUB_KINDS "${k.id}" has no empty-state message`);
  if ("open" in k && typeof k.open !== "boolean") {
    fail(`PUB_KINDS "${k.id}" has open:${JSON.stringify(k.open)} — it must be true or false. ` +
         `Any other value is truthy or falsy by accident rather than on purpose.`);
  }
}

/* The publication sections are collapsible and shut by default, which
   creates one specific way to lose content in silence: if the wiring
   stops opening a group when a search matches inside it, the reader
   searches, the count says results exist, and the list looks empty.
   Nothing throws. So the two halves are required to travel together —
   collapsible markup may not exist without the code that opens it. */
if (/<details class="group"/.test(html)) {
  if (!/\bgroup\.open\s*=/.test(html)) {
    fail("groups render as <details> but nothing ever assigns group.open — " +
         "a search would match entries inside a shut section and appear to find nothing");
  }
  if (!/searching\s*&&\s*inGroup\s*>\s*0/.test(html)) {
    warn("the open-on-search condition looks changed; check that a search still expands its matches");
  }
  if (!/summary class="group-head"/.test(html)) {
    fail("<details class=\"group\"> has no <summary class=\"group-head\"> — " +
         "the section would have no control to open it and its contents would be unreachable");
  }
}

const seenDoi = new Set();
const kindCount = Object.fromEntries([...KIND_IDS].map(id => [id, 0]));
for (const p of data.PUBLICATIONS || []) {
  const where = `"${String(p.t || "untitled").slice(0, 60)}"`;
  if (!p.t) { fail(`publication with no title: ${JSON.stringify(p).slice(0, 90)}`); continue; }
  if (!p.v) warn(`publication ${where} has no venue`);

  if (!p.k) fail(`publication ${where} has no kind (k)`);
  else if (!KIND_IDS.has(p.k)) {
    fail(`publication ${where} has unknown kind "${p.k}" — it would not render at all. ` +
         `Known kinds: ${[...KIND_IDS].join(", ")}`);
  } else kindCount[p.k]++;

  if (p.d) {
    if (!/^10\.\d{4,9}\/\S+$/.test(p.d)) fail(`publication ${where} has a malformed DOI: ${p.d}`);
    if (seenDoi.has(p.d)) fail(`publication ${where} duplicates DOI ${p.d}`);
    seenDoi.add(p.d);
  }
  if (!p.a) warn(`publication ${where} has no author list, so none is shown`);
  if (!p.y) warn(`publication ${where} has no year`);
  else if (p.y < 1960 || p.y > new Date().getFullYear() + 2) warn(`publication ${where} has an implausible year: ${p.y}`);
}

/* ── 5b. The team ──────────────────────────────────────────────────────
   Same strictness on the role as on a publication kind, and for the same
   reason: an unknown role renders into no section and the person simply
   vanishes from the page. That matters more here, because the entries
   are real people who were told they would be listed. */
const ROLE_IDS = new Set((data.TEAM_ROLES || []).map(r => r.id));
if (!ROLE_IDS.size) fail("TEAM_ROLES is empty — team members would have nowhere to render");
for (const r of data.TEAM_ROLES || []) {
  if (!r.id || !r.label) fail(`TEAM_ROLES entry missing id or label: ${JSON.stringify(r)}`);
  if (!r.empty) warn(`TEAM_ROLES "${r.id}" has no empty-state message`);
}
for (const p of data.TEAM || []) {
  const who = `"${String(p.n || "unnamed").slice(0, 50)}"`;
  if (!p.n) { fail(`team member with no name: ${JSON.stringify(p).slice(0, 90)}`); continue; }
  if (!p.r) fail(`team member ${who} has no role (r)`);
  else if (!ROLE_IDS.has(p.r)) {
    fail(`team member ${who} has unknown role "${p.r}" — they would not appear at all. ` +
         `Known roles: ${[...ROLE_IDS].join(", ")}`);
  }
  if (!p.p && !p.f) warn(`team member ${who} has neither a position nor a description`);
}

/* ── 6. The filtered-groups markup contract ────────────────────────────
   `wireFilteredGroups` is pointed at elements by id and styles them by
   class. Renaming a class in the CSS without updating the markup leaves
   a container that still works — the script finds it by id, the filter
   still filters — but never becomes a flex row, so the chips silently
   stack down the page instead of scrolling across it. Nothing throws and
   nothing looks broken in the DOM. This has already happened once.

   So: every element handed to the wiring as `filterEl` must carry the
   class the stylesheet actually targets. */
const CONTRACT = [["filterEl", "chip-filter"]];
for (const [role, cls] of CONTRACT) {
  const re = new RegExp(`${role}:\\s*document\\.getElementById\\("([^"]+)"\\)`, "g");
  const wired = [...html.matchAll(re)].map(m => m[1]);
  if (!wired.length) warn(`no element is wired as ${role} — has wireFilteredGroups been removed?`);
  for (const id of wired) {
    const el = html.match(new RegExp(`<[a-z-]+[^>]*\\sid="${id}"[^>]*>`, "i"));
    if (!el) { fail(`${role} points at id "${id}", which is not in the markup`); continue; }
    const classAttr = el[0].match(/\sclass="([^"]*)"/);
    const classes = classAttr ? classAttr[1].split(/\s+/) : [];
    if (!classes.includes(cls)) {
      fail(`#${id} is wired as ${role} but is missing class "${cls}" — ` +
           `its controls would render unstyled and stack instead of scrolling ` +
           `(has: ${classes.join(" ") || "no classes"})`);
    }
  }
}

/* Any class named in the markup but never defined in the stylesheet is
   usually a rename that was only half applied. A few are legitimate
   scripting hooks, so this warns rather than blocks. */
const styleBlock = (html.match(/<style>([\s\S]*?)<\/style>/) || ["", ""])[1];
const definedClasses = new Set([...styleBlock.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(m => m[1]));
const usedClasses = new Set();
for (const m of html.matchAll(/class="([^"$]*)"/g)) {
  for (const c of m[1].split(/\s+/)) if (c && !c.includes("{")) usedClasses.add(c);
}
for (const c of usedClasses) {
  if (!definedClasses.has(c)) warn(`class "${c}" is used in the markup but has no rule in the stylesheet`);
}

/* ── 6b. The intake forms must match the data model ────────────────────
   The issue forms are the editing interface: if a section, kind or role
   exists on the site but is not offered in the form that files changes
   against it, that part of the site becomes unreportable. Nobody notices,
   because the site itself is fine — the gap is in the way in.

   This is a warning rather than a failure: the published page is not
   broken by it, and the rule here is to block only what you could point
   at on the live site and call a defect. */
function formText(name) {
  try { return readFileSync(join(ROOT, ".github/ISSUE_TEMPLATE", name), "utf8"); }
  catch { return null; }
}
/** The choices of one dropdown, by field id. Reading the whole file
    instead is not good enough: these forms explain their options in prose
    too ("Collaborators is for peers…"), so a plain substring search finds
    the word after the option itself has been deleted. Only the list under
    that field's `options:` counts. */
function formOptions(text, id) {
  const block = text.match(
    new RegExp(`id:\\s*${id}\\b[\\s\\S]*?\\n\\s*options:\\s*\\n([\\s\\S]*?)(?=\\n\\s*validations:|\\n\\s*-\\s*type:|$)`));
  if (!block) return null;
  return block[1].split("\n").map(l => l.trim())
    .filter(l => l.startsWith("- ")).map(l => l.slice(2).trim());
}

const FORM_SYNC = [
  ["website-change.yml",   "SECTIONS",   (data.SECTIONS   || []).map(s => s.label), "page"],
  ["add-publication.yml",  "PUB_KINDS",  (data.PUB_KINDS  || []).map(k => k.label), "kind"],
  ["add-team-member.yml",  "TEAM_ROLES", (data.TEAM_ROLES || []).map(r => r.label), "role"],
];
for (const [file, array, labels, what] of FORM_SYNC) {
  const text = formText(file);
  if (text === null) { warn(`issue form ${file} is missing`); continue; }
  const options = formOptions(text, what);
  if (!options) { warn(`issue form ${file} has no "${what}" dropdown to keep in step with ${array}`); continue; }
  /* Forms word options in the singular — "Journal article" for the
     "Journal articles" section — and English is not tidy about it:
     "Theses" becomes "Thesis", not "These". So compare a small set of
     plausible forms rather than one naive de-pluralisation, and allow an
     option to carry a trailing gloss ("Other output (book chapter, …)").
     The match is against whole options, never against the file. */
  const forms_ = s => {
    const l = s.toLowerCase();
    return [...new Set([l, l.replace(/s$/, ""), l.replace(/es$/, ""), l.replace(/es$/, "is")])];
  };
  for (const label of labels) {
    if (!label) continue;
    const wanted = forms_(label);
    const found = options.some(o => {
      const ol = o.toLowerCase();
      return wanted.some(w => ol === w || ol.startsWith(w + " ") || ol.startsWith(w + ","));
    });
    if (!found) {
      warn(`${array} has "${label}" but ${file} offers no matching ${what} option — ` +
           `changes to it cannot be requested through the form`);
    }
  }
}

/* ── 6c. The JSON and the HTML must agree ──────────────────────────────
   Content is edited as `content/*.json` and copied into index.html by
   scripts/build.mjs. If the two drift, the editor shows one thing and the
   published site says another — and the editor is the surface that looks
   authoritative, so the discrepancy is invisible from there.

   The publish workflow rebuilds before deploying, so this is a warning
   rather than a failure: the deployed page is correct either way. What is
   wrong is the copy committed to the repository, which is what a person
   reads when they open index.html locally. */
try {
  const {readContentFiles, readArraysFromHtml, FILES} =
    await import("../scripts/content.mjs");
  const {content, missing, malformed} = readContentFiles();
  if (missing.length)   fail(`content files missing: ${missing.join(", ")} — the editor has nothing to edit`);
  if (malformed.length) fail(`content files with no "items" array: ${malformed.join(", ")}`);

  const inHtml = readArraysFromHtml(html);
  const drifted = [];
  for (const name of Object.keys(FILES)) {
    if (!(name in content) || !(name in inHtml)) continue;
    if (JSON.stringify(content[name]) !== JSON.stringify(inHtml[name])) drifted.push(name);
  }
  if (drifted.length) {
    warn(`index.html disagrees with content/ for: ${drifted.join(", ")} — ` +
         `run "node scripts/build.mjs"`);
  }

  /* Every content file should be reachable from the editor, or it can only
     be changed by hand — which defeats the point of having one. */
  const cfg = (() => {
    try { return readFileSync(join(ROOT, "admin/config.yml"), "utf8"); } catch { return null; }
  })();
  if (cfg === null) warn("admin/config.yml is missing — the editor at /admin/ will not load");
  else {
    if (cfg.includes("REPLACE-ME")) {
      warn("admin/config.yml still has the placeholder base_url — saving from the editor " +
           "will fail at sign-in until the auth service is set up (see MAINTAINING.md)");
    }
    for (const file of Object.values(FILES)) {
      if (!cfg.includes(`content/${file}`)) {
        warn(`content/${file} is not in admin/config.yml — it cannot be edited through the editor`);
      }
    }

    /* Every editable file should have a preview, or its form is the only
       thing the editor shows and you are back to guessing what a change
       will look like. The names must match: a renderer keyed to a name no
       collection uses is dead code that nothing reports. */
    let js = null;
    try { js = readFileSync(join(ROOT, "admin/preview.js"), "utf8"); } catch { /* below */ }
    if (js === null) warn("admin/preview.js is missing — the editor falls back to a generic preview");
    else {
      const fileNames = [...cfg.matchAll(/^\s*-\s*name:\s*([\w-]+)\s*$/gm)].map(m => m[1])
        .filter(n => cfg.includes(`name: ${n}`) && /_/.test(n));
      const rendered = [...js.matchAll(/^\s{2}([A-Za-z0-9_]+)\s*:/gm)].map(m => m[1]);
      for (const n of fileNames) {
        if (!rendered.includes(n)) warn(`admin/config.yml has "${n}" but admin/preview.js has no preview for it`);
      }
      for (const n of rendered) {
        if (!fileNames.includes(n)) warn(`admin/preview.js renders "${n}", which no collection file is called`);
      }
    }

    /* The preview stylesheet is generated from index.html. If it is stale
       the preview is styled by an older design than the page. */
    const cssFile = (() => {
      try { return readFileSync(join(ROOT, "admin/preview.css"), "utf8"); } catch { return null; }
    })();
    if (cssFile === null) warn("admin/preview.css is missing — run: node scripts/build.mjs");
    else {
      const {previewCss} = await import("../scripts/content.mjs");
      if (cssFile !== previewCss(html)) {
        warn("admin/preview.css is out of date with the stylesheet in index.html — " +
             "the editor would preview an older design. Run: node scripts/build.mjs");
      }
    }
  }
} catch (e) {
  fail(`could not compare index.html with content/: ${e.message}`);
}

/* ── 7. Things a reader would notice ───────────────────────────────── */
if (!/<title>[^<]+<\/title>/.test(html)) fail("no <title>");
if (!/<meta name="description" content="[^"]{40,}"/.test(html)) warn("meta description missing or very short");
if (!/<html lang="[a-z]{2}/.test(html)) fail("<html> has no lang attribute");
for (const m of html.matchAll(/<img\b(?![^>]*\balt=)[^>]*>/gi)) {
  fail(`<img> without alt text: ${m[0].slice(0, 80)}`);
}
if (/__[A-Z_]+__|\/\*__[A-Z_]+__\*\//.test(html)) fail("an unreplaced __PLACEHOLDER__ is still in the file");
if (/\bTODO\b/.test(html)) warn("the file still contains a TODO");

/* ── Report ───────────────────────────────────────────────────────── */
const kb = (html.length / 1024).toFixed(0);
const breakdown = Object.entries(kindCount).map(([k, n]) => `${n} ${k}`).join(", ");
console.log(`index.html — ${kb} kB, ${ids.size} ids, ${(data.SECTIONS || []).length} sections`);
console.log(`${(data.PUBLICATIONS || []).length} publications (${breakdown}) · ${seenDoi.size} with a DOI`);

for (const w of warnings) console.log("WARN   " + w);
for (const e of errors) console.error("ERROR  " + e);

if (errors.length) {
  console.error(`\n${errors.length} error${errors.length > 1 ? "s" : ""} — not publishing.`);
  process.exit(1);
}
console.log(`\nOK${warnings.length ? ` (${warnings.length} warning${warnings.length > 1 ? "s" : ""})` : ""} — safe to publish.`);

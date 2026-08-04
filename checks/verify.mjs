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

const ARRAYS = ["SECTIONS", "METRICS", "RESEARCH", "PROGRAMS", "TEACHING", "NEWS", "CONTACT", "PUBLICATIONS"];
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
  if (!html.includes(`data-panel="${s.id}"`)) {
    fail(`section "${s.id}" has no matching <section data-panel="${s.id}">`);
  }
}
const panelIds = [...html.matchAll(/data-panel="([^"]+)"/g)].map(m => m[1]);
for (const id of panelIds) {
  if (!(data.SECTIONS || []).some(s => s.id === id)) {
    warn(`panel "${id}" exists but is not listed in SECTIONS, so nothing links to it`);
  }
}

/* ── 5. Publications ───────────────────────────────────────────────────
   Every entry becomes a doi.org link, so a malformed DOI is a 404 with
   this site's name on it. */
const seenDoi = new Set();
for (const p of data.PUBLICATIONS || []) {
  const where = `"${String(p.t || "untitled").slice(0, 60)}"`;
  if (!p.t) fail(`publication with no title: ${JSON.stringify(p).slice(0, 90)}`);
  if (!p.d) { fail(`publication ${where} has no DOI`); continue; }
  if (!/^10\.\d{4,9}\/\S+$/.test(p.d)) fail(`publication ${where} has a malformed DOI: ${p.d}`);
  if (seenDoi.has(p.d)) fail(`publication ${where} duplicates DOI ${p.d}`);
  seenDoi.add(p.d);
  if (!p.a) warn(`publication ${where} has no author list`);
  if (!p.y) warn(`publication ${where} has no year`);
  else if (p.y < 1970 || p.y > new Date().getFullYear() + 2) warn(`publication ${where} has an implausible year: ${p.y}`);
}

/* ── 6. Things a reader would notice ───────────────────────────────── */
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
console.log(`index.html — ${kb} kB, ${ids.size} ids, ${(data.PUBLICATIONS || []).length} publications, ${(data.SECTIONS || []).length} sections`);

for (const w of warnings) console.log("WARN   " + w);
for (const e of errors) console.error("ERROR  " + e);

if (errors.length) {
  console.error(`\n${errors.length} error${errors.length > 1 ? "s" : ""} — not publishing.`);
  process.exit(1);
}
console.log(`\nOK${warnings.length ? ` (${warnings.length} warning${warnings.length > 1 ? "s" : ""})` : ""} — safe to publish.`);

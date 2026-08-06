/**
 * content.mjs — the one place that knows how content moves between
 * `content/*.json` and the arrays inside `index.html`.
 *
 * The JSON files are the source of truth: Sveltia CMS reads and writes
 * them, and `build.mjs` copies them into `index.html`. `verify.mjs` uses
 * the same functions to prove the two have not drifted apart.
 *
 * `index.html` still holds a complete copy of the content rather than
 * fetching it, because the site must stay a single self-contained file
 * that opens from a file:// URL with the network off. The JSON is the
 * editing surface; the HTML is the artefact.
 */

import {readFileSync, writeFileSync, existsSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import vm from "node:vm";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const HTML = join(ROOT, "index.html");
export const CONTENT = join(ROOT, "content");

/**
 * One file per page of the site, so that one page is one thing to edit.
 *
 * Each entry maps a content file to the arrays inside `index.html` it
 * fills, keyed by the property it lives under in the JSON. The Profile
 * page, for instance, is a single file holding both the hero and the four
 * figures — because in the editor it is a single page, and splitting it
 * across two files made you choose between two forms before you could see
 * what you were editing.
 */
export const FILES = {
  "home.json":         {HOME: "hero", METRICS: "metrics"},
  "sections.json":     {SECTIONS: "items"},
  "research.json":     {RESEARCH: "items"},
  "publications.json": {PUBLICATIONS: "items", PUB_KINDS: "sections"},
  "programs.json":     {PROGRAMS: "items"},
  "team.json":         {TEAM: "items", TEAM_ROLES: "sections"},
  "teaching.json":     {TEACHING: "items"},
  "news.json":         {NEWS: "items"},
  "contact.json":      {CONTACT: "items"},
};

/** Every array name the site expects, in injection order. */
export const ARRAY_NAMES = Object.values(FILES).flatMap(m => Object.keys(m));

/** Arrays whose entries are written one per line — long lists where a
    line-per-record keeps diffs readable. */
const DENSE = new Set(["PUBLICATIONS"]);

/**
 * Locate `const NAME = [ … ];` and return the exact source span of the
 * bracketed literal, by matching brackets while respecting strings. A
 * regex cannot do this: the content itself contains brackets and quotes.
 */
export function findArray(html, name) {
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
    else if (c === "]") { depth--; if (depth === 0) return {open, close: i + 1}; }
  }
  return null;
}

/** Evaluate one array literal out of the HTML. They are pure data. */
export function readArray(html, name) {
  const span = findArray(html, name);
  if (!span) return null;
  return vm.runInNewContext(`(${html.slice(span.open, span.close)})`, Object.create(null), {timeout: 3000});
}

/** Every array, as plain data. */
export function readArraysFromHtml(html) {
  const out = {};
  for (const name of ARRAY_NAMES) {
    const v = readArray(html, name);
    if (v !== null) out[name] = v;
  }
  return out;
}

/**
 * The JSON files, as plain data. Missing files are reported, not guessed.
 *
 * Each file holds `{"items": [...]}` rather than a bare array, because a
 * CMS file collection maps fields onto an object at the root of the file
 * and cannot address a top-level array.
 */
export function readContentFiles() {
  const out = {}, missing = [], malformed = [];
  for (const [file, map] of Object.entries(FILES)) {
    const p = join(CONTENT, file);
    if (!existsSync(p)) { missing.push(file); continue; }
    const parsed = JSON.parse(readFileSync(p, "utf8"));
    for (const [name, key] of Object.entries(map)) {
      if (!Array.isArray(parsed?.[key])) { malformed.push(`${file} → "${key}"`); continue; }
      out[name] = parsed[key];
    }
  }
  return {content: out, missing, malformed};
}

/** Write one content file from the arrays it carries. */
export function writeContentFile(file, data) {
  const map = FILES[file];
  const body = {};
  for (const [name, key] of Object.entries(map)) body[key] = data[name] ?? [];
  writeFileSync(join(CONTENT, file), JSON.stringify(body, null, 2) + "\n");
}

/** Render an array back to JS source, indented to sit in the script. */
export function formatArray(name, value) {
  const pad = "    ";
  if (!value.length) return "[]";
  const lines = DENSE.has(name)
    ? value.map(v => pad + JSON.stringify(v) + ",")
    : value.map(v => pad + JSON.stringify(v, null, 2).split("\n").join("\n" + pad) + ",");
  return "[\n" + lines.join("\n") + "\n  ]";
}

/** Write every array in `data` into `html`, returning the new source. */
export function injectArrays(html, data) {
  let out = html;
  for (const name of ARRAY_NAMES) {
    if (!(name in data)) continue;
    const span = findArray(out, name);
    if (!span) throw new Error(`index.html has no ${name} array to write into`);
    out = out.slice(0, span.open) + formatArray(name, data[name]) + out.slice(span.close);
  }
  return out;
}

/**
 * Inline the portrait named in content/home.json as a data URI.
 *
 * This is what lets the photograph be *both* things it needs to be: an
 * ordinary image file that the CMS can upload and replace, and — in the
 * published page — bytes carried inside the one self-contained file, so
 * the site still opens offline and fetches nothing.
 */
export function inlinePortrait(html, home) {
  const src = home?.[0]?.portrait;
  if (!src) return html;
  let bytes;
  try { bytes = readFileSync(join(ROOT, src)); }
  catch { throw new Error(`content/home.json points at ${src}, which is not in the repository`); }
  const type = /\.png$/i.test(src) ? "png" : /\.jpe?g$/i.test(src) ? "jpeg" : "webp";
  const uri = `data:image/${type};base64,${bytes.toString("base64")}`;
  /* Only the hero portrait — matched by its id so nothing else is touched. */
  return html.replace(/(<img id="hero-portrait" src=")[^"]*(")/, `$1${uri}$2`);
}

export const readHtml = () => readFileSync(HTML, "utf8");
export const writeHtml = s => writeFileSync(HTML, s);

export const PREVIEW_CSS = join(ROOT, "admin", "preview.css");  /* legacy */

const PREVIEW_HEADER = `/* Generated by scripts/build.mjs from the <style> block in index.html.
   Do not edit — your changes are overwritten on the next build.

   This is the site's own stylesheet, handed to the editor so that a
   preview looks like the page rather than approximating it. Because it
   is copied rather than rewritten, the preview cannot drift away from
   the site as the design changes. */
`;

/** The site's stylesheet, as the editor's preview should see it. */
export function previewCss(html) {
  const m = html.match(/<style>([\s\S]*?)<\/style>/);
  if (!m) throw new Error("index.html has no <style> block to copy for the preview");
  /* The rail is fixed-position chrome and the panels are hidden by the
     panel engine; neither belongs in a preview of one entry. */
  return PREVIEW_HEADER + m[1] + `
/* ── preview only ──────────────────────────────────────────────────── */
.rail,.bar{display:none!important}
.panel[hidden]{display:block!important}
body{background:var(--paper);padding:26px 30px}
.cms-preview{max-width:64rem}
.cms-preview > .group:first-of-type .group-head{margin-top:0}
`;
}

export const readPreviewCss = () => {
  try { return readFileSync(PREVIEW_CSS, "utf8"); } catch { return null; }
};
export const writePreviewCss = s => writeFileSync(PREVIEW_CSS, s);

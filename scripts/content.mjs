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

/** JS array name → the file Sveltia edits. Order is display order. */
export const FILES = {
  SECTIONS:     "sections.json",
  METRICS:      "metrics.json",
  RESEARCH:     "research.json",
  PROGRAMS:     "programs.json",
  TEAM_ROLES:   "team-roles.json",
  TEAM:         "team.json",
  TEACHING:     "teaching.json",
  NEWS:         "news.json",
  CONTACT:      "contact.json",
  PUB_KINDS:    "pub-kinds.json",
  PUBLICATIONS: "publications.json",
};

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
  for (const name of Object.keys(FILES)) {
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
  for (const [name, file] of Object.entries(FILES)) {
    const p = join(CONTENT, file);
    if (!existsSync(p)) { missing.push(file); continue; }
    const parsed = JSON.parse(readFileSync(p, "utf8"));
    if (!Array.isArray(parsed?.items)) { malformed.push(file); continue; }
    out[name] = parsed.items;
  }
  return {content: out, missing, malformed};
}

/** Write one array out in the shape the CMS expects. */
export function writeContentFile(file, items) {
  writeFileSync(join(CONTENT, file), JSON.stringify({items}, null, 2) + "\n");
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
  for (const name of Object.keys(FILES)) {
    if (!(name in data)) continue;
    const span = findArray(out, name);
    if (!span) throw new Error(`index.html has no ${name} array to write into`);
    out = out.slice(0, span.open) + formatArray(name, data[name]) + out.slice(span.close);
  }
  return out;
}

export const readHtml = () => readFileSync(HTML, "utf8");
export const writeHtml = s => writeFileSync(HTML, s);

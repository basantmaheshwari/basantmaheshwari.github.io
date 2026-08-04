#!/usr/bin/env node
/**
 * build.mjs — copy `content/*.json` into the arrays inside `index.html`.
 *
 * Run it after editing content, or let the publish workflow run it. It is
 * not a bundler and it installs nothing: the site still has no
 * dependencies, and `index.html` remains a single self-contained file you
 * can open from disk. All this does is keep the copy inside the HTML in
 * step with the JSON that Sveltia CMS edits.
 *
 *     node scripts/build.mjs           write index.html from content/
 *     node scripts/build.mjs --check   exit 1 if it would change anything
 */

import {readHtml, writeHtml, readContentFiles, injectArrays, FILES,
        previewCss, readPreviewCss, writePreviewCss} from "./content.mjs";

const check = process.argv.includes("--check");
const {content, missing, malformed} = readContentFiles();

if (missing.length) {
  console.error(`FATAL  missing content files: ${missing.join(", ")}`);
  process.exit(1);
}
if (malformed.length) {
  console.error(`FATAL  these files have no "items" array at the root: ${malformed.join(", ")}`);
  process.exit(1);
}

const before = readHtml();
let after;
try {
  after = injectArrays(before, content);
} catch (e) {
  console.error("FATAL  " + e.message);
  process.exit(1);
}

const counts = Object.keys(FILES).map(n => `${content[n].length} ${n.toLowerCase()}`).join(", ");

/* The editor's preview stylesheet is a copy of the site's own, so it is
   regenerated here rather than maintained by hand. */
const css = previewCss(after);
const cssStale = readPreviewCss() !== css;

const htmlStale = before !== after;

if (!htmlStale && !cssStale) {
  console.log(`index.html and admin/preview.css are in step with content/ — ${counts}`);
  process.exit(0);
}

if (check) {
  if (htmlStale) console.error("ERROR  index.html does not match content/");
  if (cssStale)  console.error("ERROR  admin/preview.css does not match the stylesheet in index.html");
  console.error("       run: node scripts/build.mjs");
  process.exit(1);
}

if (htmlStale) writeHtml(after);
if (cssStale) writePreviewCss(css);
console.log(`rewritten: ${[htmlStale && "index.html", cssStale && "admin/preview.css"].filter(Boolean).join(" + ")} — ${counts}`);

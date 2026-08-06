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

import {readHtml, writeHtml, readContentFiles, injectArrays, inlinePortrait, ARRAY_NAMES} from "./content.mjs";

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
  after = inlinePortrait(injectArrays(before, content), content.HOME);
} catch (e) {
  console.error("FATAL  " + e.message);
  process.exit(1);
}

const counts = ARRAY_NAMES.map(n => `${(content[n] || []).length} ${n.toLowerCase()}`).join(", ");

/* No stylesheet to generate any more: the editor previews the real site in
   an iframe, so it uses the site's own <style> directly. */
if (before === after) {
  console.log(`index.html is in step with content/ — ${counts}`);
  process.exit(0);
}

if (check) {
  console.error("ERROR  index.html does not match content/ — run: node scripts/build.mjs");
  process.exit(1);
}

writeHtml(after);
console.log(`index.html rewritten from content/ — ${counts}`);

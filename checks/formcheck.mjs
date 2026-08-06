/**
 * formcheck.mjs — does each form in the editor match the file it edits?
 *
 * Everything else about the editor was checked by looking for a string in
 * `admin/config.yml`: is there a portrait field, is every content file
 * mentioned, is there one form per page. All of that passed while the
 * Profile page showed an empty form, because the config declared `hero` as
 * an object and `content/home.json` held a list of one. Presence was never
 * the problem; shape was.
 *
 * Two failures are worth catching, and both are silent:
 *
 *   * A form whose shape disagrees with the file renders blank — and then
 *     saving that blank form writes it over the real content.
 *   * A key in the file that no field declares cannot be edited, and is
 *     dropped the first time anyone saves that entry, because the editor
 *     writes the fields it knows and nothing else.
 *
 * Neither shows up as an error anywhere. The page just quietly empties.
 */

import {readFileSync, readdirSync} from "node:fs";
import {join} from "node:path";

/* ── a small YAML reader ───────────────────────────────────────────────
   Block mappings, block sequences, inline flow mappings (which wrap over
   several lines in this file), and folded scalars. That is all the config
   uses. A dependency for this would be the only one in the repository. */
export function parseYaml(src) {
  const lines = [];
  const raw = src.split("\n");
  for (let i = 0; i < raw.length; i++) {
    const line = raw[i];
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const indent = line.match(/^ */)[0].length;
    let body = line.slice(indent);
    /* A folded scalar swallows its own indented block. */
    if (/:\s*[>|][-+]?\s*$/.test(body)) {
      while (i + 1 < raw.length &&
             (!raw[i + 1].trim() || raw[i + 1].match(/^ */)[0].length > indent)) i++;
      body = body.replace(/[>|][-+]?\s*$/, "''");
    }
    /* A flow mapping may wrap. Join lines until the braces balance. */
    const bal = s => (s.match(/\{/g) || []).length - (s.match(/\}/g) || []).length;
    while (bal(body) > 0 && i + 1 < raw.length) body += " " + raw[++i].trim();
    lines.push({indent, body});
  }

  let pos = 0;
  /* `min` is a floor rather than an exact depth: the file indents by two
     spaces in some places and four in others, so each block takes its
     level from the first line it actually sees. */
  function block(min) {
    if (pos >= lines.length || lines[pos].indent < min) return null;
    const indent = lines[pos].indent;
    if (lines[pos].body.startsWith("- ")) {
      const arr = [];
      while (pos < lines.length && lines[pos].indent === indent &&
             lines[pos].body.startsWith("- ")) {
        const rest = lines[pos].body.slice(2);
        if (rest.startsWith("{")) { arr.push(flow(rest)); pos++; }
        else {
          /* An item whose first key sits on the dash line itself. */
          lines[pos] = {indent: indent + 2, body: rest};
          arr.push(block(indent + 1));
        }
      }
      return arr;
    }
    const obj = {};
    while (pos < lines.length && lines[pos].indent === indent &&
           !lines[pos].body.startsWith("- ")) {
      const m = lines[pos].body.match(/^([^:]+):\s*(.*)$/);
      if (!m) { pos++; continue; }
      const [, key, val] = m;
      pos++;
      obj[key.trim()] = val === "" ? (block(indent + 1) ?? null)
                      : /^[{[]/.test(val) ? flow(val)
                      : scalar(val);
    }
    return obj;
  }

  function scalar(v) {
    v = v.trim().replace(/\s+#.*$/, "");
    if (/^'.*'$/.test(v) || /^".*"$/.test(v)) return v.slice(1, -1);
    if (v === "true") return true;
    if (v === "false") return false;
    return v;
  }

  function flow(s) {
    let i = 0;
    function val() {
      while (s[i] === " ") i++;
      if (s[i] === "{") {
        i++; const o = {};
        while (s[i] !== "}") {
          while (" ,".includes(s[i])) i++;
          if (s[i] === "}") break;
          let k = ""; while (s[i] !== ":") k += s[i++];
          i++; o[k.trim()] = val();
        }
        i++; return o;
      }
      if (s[i] === "[") {
        i++; const a = [];
        while (s[i] !== "]") {
          while (" ,".includes(s[i])) i++;
          if (s[i] === "]") break;
          a.push(val());
        }
        i++; return a;
      }
      if (s[i] === "'" || s[i] === '"') {
        const q = s[i++]; let t = "";
        while (s[i] !== q) t += s[i++];
        i++; return t;
      }
      let t = "";
      while (i < s.length && !",}]".includes(s[i])) t += s[i++];
      return scalar(t);
    }
    return val();
  }

  return block(0);
}

/**
 * Compare every form against the file it edits.
 *
 * Returns problems as strings. All of them are defects you could point at
 * on the live editor, so verify.mjs treats them as failures.
 */
export function formProblems(cfgSrc, root) {
  const out = [];
  let cfg;
  try { cfg = parseYaml(cfgSrc); }
  catch (e) { return [`admin/config.yml could not be read: ${e.message}`]; }
  if (!Array.isArray(cfg?.collections)) return ["admin/config.yml has no collections"];

  const edited = [];
  for (const col of cfg.collections) {
    const where = col.label || col.name;
    for (const entry of col.files || []) {
      const path = entry.file;
      if (!path) continue;
      edited.push(path.replace(/^content\//, ""));

      let data;
      try { data = JSON.parse(readFileSync(join(root, path), "utf8")); }
      catch (e) { out.push(`"${where}" edits ${path}, which cannot be read: ${e.message}`); continue; }

      const fields = entry.fields || [];
      const declared = fields.map(f => f.name);

      for (const f of fields) {
        const value = data[f.name];
        if (value === undefined) {
          out.push(`"${where}" has a field "${f.name}" that ${path} does not contain — ` +
                   "the form shows nothing, and saving it invents the key");
          continue;
        }
        const want = f.widget === "list" ? "array" : f.widget === "object" ? "object" : null;
        const got = Array.isArray(value) ? "array" : typeof value;
        if (want && want !== got) {
          out.push(`"${where}" declares "${f.name}" as ${f.widget === "object" ? "an" : "a"} ${f.widget} but ${path} holds ` +
                   `${got === "array" ? "a list" : `a ${got}`} — the fields render empty, ` +
                   "and saving that empty form overwrites the real content");
        }
      }

      for (const key of Object.keys(data)) {
        if (!declared.includes(key)) {
          out.push(`${path} contains "${key}" but no field in "${where}" declares it — ` +
                   "it cannot be edited, and a save would drop it");
        }
      }

      /* The same question one level down, for the keys inside list items. */
      for (const f of fields) {
        const sub = (f.fields || []).map(x => x.name);
        if (!sub.length) continue;
        const value = data[f.name];
        const items = Array.isArray(value) ? value
                    : (value && typeof value === "object") ? [value] : [];
        const seen = new Set();
        for (const item of items) {
          if (item && typeof item === "object") for (const k of Object.keys(item)) seen.add(k);
        }
        for (const k of seen) {
          if (!sub.includes(k)) {
            out.push(`entries in "${f.name}" (${where}) carry "${k}", which the form has ` +
                     "no field for — editing one of them drops it");
          }
        }
      }
    }
  }

  let files = [];
  try { files = readdirSync(join(root, "content")).filter(f => f.endsWith(".json")); } catch {}
  for (const f of files) {
    if (!edited.includes(f)) out.push(`content/${f} has no form in admin/config.yml — it can only be changed by hand`);
  }
  return out;
}

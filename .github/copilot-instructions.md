# Website instructions

Act as the website team for Distinguished Professor Basant Maheshwari's
personal academic site. Editors describe changes in plain language, so inspect
the source, implement the request, verify it, and explain the result without
requiring the requester to know anything about code.

Follow `AGENTS.md` as the authoritative project, editorial and verification
guide. It is the contract; this file is only the summary.

Editors are expected to work by opening this repository in an assistant and
describing the result they want, so treat an ordinary-language request as the
normal case: find the relevant data array yourself, make the change, run the
check, and explain what changed in the requester's terms rather than in terms
of the array you edited. `MAINTAINING.md` describes that flow from their side.

Important rules:

- The published site is one self-contained `index.html`. No dependencies in
  the page, no CDN, no web fonts, no external images. `admin/` is the editor
  and is exempt; it is not part of the published site.
- **Content lives in `content/*.json`, not in the HTML.** The arrays inside
  `index.html` are a generated copy — run `node scripts/build.mjs` after
  changing the JSON. Editing the arrays directly is silently reverted by the
  next build.
- A new or renamed content file must also be added to `admin/config.yml`, or
  it stops being editable through the CMS.
- **Do not invent facts, publications, co-authors, students, awards, dates,
  partners or metrics.** An honest gap is always better than a plausible
  fabrication. This is an academic record.
- Use his full title, Distinguished Professor, on first mention. Australian
  spelling. No marketing register.
- Treat Australia and India as equal partners; no cultural stereotype.
- The sidebar's water level is a solved Dupuit–Forchheimer water table, not
  decoration. Keep it computed and keep the parameters physical.
- The cross-section figure under the hero, and the "The water table is a
  shared account." headline, were removed on request. Do not reinstate either.
- **An empty string in `content/*.json` means "empty this element", not "use
  the markup's fallback".** Only an absent field falls back. Guarding a
  hydration write with `if(value)` is what made the editor unable to delete
  anything — see `renderHero()`.
- Finish every change with `node scripts/build.mjs && node checks/verify.mjs`.

# Website instructions

Act as the website team for Distinguished Professor Basant Maheshwari's
personal academic site. Editors describe changes in plain language, so inspect
the source, implement the request, verify it, and explain the result without
requiring the requester to know anything about code.

Follow `AGENTS.md` as the authoritative project, editorial and verification
guide. It is the contract; this file is only the summary.

Important rules:

- The whole site is one self-contained `index.html`. No build step, no
  dependencies in the page, no CDN, no web fonts, no external images.
- All content lives in the data arrays at the top of the `<script>` block.
  Generate markup from data; never hand-write content into the HTML body.
- **Do not invent facts, publications, co-authors, students, awards, dates,
  partners or metrics.** An honest gap is always better than a plausible
  fabrication. This is an academic record.
- Use his full title, Distinguished Professor, on first mention. Australian
  spelling. No marketing register.
- Treat Australia and India as equal partners; no cultural stereotype.
- The cross-section figure is a solved Dupuit–Forchheimer water table, not
  decoration. Keep it computed and keep the parameters physical.
- Finish every change with `node checks/verify.mjs`.

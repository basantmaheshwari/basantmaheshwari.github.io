# Website assistant guide

## What this repository is

This repository is the personal academic website of **Distinguished Professor
Basant Maheshwari** — water, environment and sustainability at the School of
Science, Western Sydney University; Director of the Australia India Water
Centre; leader of the MARVI programme.

It publishes to <https://basantmaheshwari.github.io/basantmaheshwari/>.

Most requests here will come from someone describing a change in ordinary
language — a new paper, a corrected title, an event to add. Turn that request
into a complete, verified website update. Do not expect the requester to name
files, frameworks or commands, and do not ask them to.

## The one architectural rule

**The entire website is a single self-contained `index.html`.** Inline
`<style>` in the head, inline `<script>` at the end. No framework, no npm
packages in the page, no bundler, no CDN, no web fonts, no external images. It
must open correctly from a file:// URL with the network switched off.

Do not add a build step. Do not add a dependency. Do not link a font, an icon
set, an analytics tag or a stylesheet from another host. If you believe a
change genuinely requires one, stop and say so in the issue rather than adding
it — `checks/verify.mjs` will refuse the deploy anyway.

The portrait is embedded as a base64 `data:` URI for this reason. Any new
image must be embedded the same way, and kept small.

## Where content lives

**Never write content into the HTML.** Every word the site displays comes from
a plain data array at the top of the `<script>` block, and the markup is
generated from those arrays. Editing the HTML body by hand is almost always
the wrong change.

| Array          | Drives                                                        |
| -------------- | ------------------------------------------------------------- |
| `SECTIONS`     | The rail, the mobile menu and the panel engine                 |
| `METRICS`      | The four figures on the profile page                           |
| `RESEARCH`     | Research themes                                                |
| `PROGRAMS`     | MARVI, AIWC, Young Water Professionals, dam safety training    |
| `TEACHING`     | Teaching and capacity building                                 |
| `NEWS`         | News items, newest first                                       |
| `CONTACT`      | Contact channels and profile links                             |
| `PUBLICATIONS` | The publication list — see the format below                    |

A research, programme or news entry looks like this:

```js
{
  name:"Village-scale managed aquifer recharge",
  year:"Ongoing",            // free text: a year, a range, or "Ongoing"
  status:"current",          // "current" and "live" get the accent chip
  blurb:"One paragraph, written in full sentences.",
  tags:["Groundwater recharge","Rajasthan"],
  links:[{label:"Programme site", href:"https://…"}],   // optional
}
```

A publication is deliberately terser, because there are many of them:

```js
{y:2026, t:"Title as published", a:"Family, I., Family, I.", v:"Journal name",
 d:"10.1002/wwp2.70094", c:2},
```

`y` year · `t` title · `a` authors · `v` venue · `d` DOI · `c` citation count.
Authors are `Family, I.` separated by commas, truncated to six followed by
`et al.`. Write his own name exactly `Maheshwari, B.` — the renderer matches
that string to set it in bold, and any other spelling will silently fail to
emphasise. Publications are listed newest first and grouped by year
automatically; insert a new one in the right place in the array.

Adding a whole new section means adding one object to `SECTIONS` **and** a
matching `<section class="panel" data-panel="…">` in the HTML. The rail, the
menu and the panel engine all build themselves from `SECTIONS`, so they cannot
drift apart — and `verify.mjs` fails the build if a section has no panel.

## Which files are public

This repository is named the same as the account, which makes it GitHub's
**profile repository**: `README.md` is rendered on <https://github.com/basantmaheshwari>
for anyone who visits his profile. Keep it short, public-facing and about him.

Maintenance notes belong in `MAINTAINING.md`, and instructions for you belong
here in `AGENTS.md`. Do not move either of those into `README.md`.

Only `index.html` is published to the website itself — the deploy workflow
copies that one file into `_site/`. Everything else is tooling.

## Editorial direction

- He is a **Distinguished Professor**. Use the full title on first mention.
- Present a serious academic record plainly. No marketing register, no
  superlatives the record does not support, no exclamation marks.
- Treat Australia and India as equal partners. Never use decorative cultural
  stereotype — no lotus motifs, no kangaroos, no saffron-and-green palettes.
- Prefer specific, checkable statements to general praise. "More than 10,000
  villages" is worth more than "widely recognised".
- British/Australian spelling: *programme*, *organisation*, *recognised*.

## The rule that matters most: do not invent

**Do not add a fact that is not traceable to a source.** No invented
publications, co-authors, students, awards, grant amounts, dates, partner
organisations or metrics. This is an academic record; a fabricated line in it
is a serious problem for him, not a cosmetic one.

If a request needs a detail that was not supplied, do one of:

1. Ask for it in the issue, or
2. Add what was supplied and leave the rest out, saying what is missing.

Leaving an honest gap is always correct. An empty section shows a plain empty
state by design — that is preferable to filling it.

Sources already used, and the right place to check first:

- Publications — [ORCID 0000-0002-5496-4345](https://orcid.org/0000-0002-5496-4345),
  enriched from [Crossref](https://api.crossref.org/) for authors and venues.
- Citation metrics — [Google Scholar](https://scholar.google.com/citations?user=g8Pn5w0AAAAJ&hl=en).
  Update `METRICS` and the two places in `CONTACT`/`pub-note` together, and
  put the retrieval date in the comment above `METRICS`.
- Programmes and events — [aiwc.org.au](https://aiwc.org.au/) and
  [westernsydney.edu.au/marvi](https://www.westernsydney.edu.au/marvi).

## The cross-section on the profile page

The figure on the profile page is not decoration and should not be treated as
adjustable styling. The water table is solved each frame from the
Dupuit–Forchheimer equation for unconfined flow with areal recharge:

```
h(x)² = h₁² + (h₂² − h₁²)·x/L + (N/K)·x·(L − x)
```

The final term is the recharge mound. The parameters (`H1`, `H2`, `K`,
`NK_PEAK`, `NK_MIN`, well depths) are chosen so the numbers stay physically
plausible: recharge of roughly 0.02–0.46 m/yr, a water table that never
breaches the land surface, and two of the six wells failing at the driest
point. If you change one, check the readout still reports sensible metres and
that the caption still describes what is drawn.

Do not replace the solved curve with a hand-drawn or eased path. The claim in
the caption is that it is computed, and that claim has to stay true.

## Required workflow

1. Read the relevant array and the surrounding code before changing anything.
2. Make the smallest coherent change that fully satisfies the request.
3. Run the checker — this is not optional:

   ```sh
   node checks/verify.mjs
   ```

4. If the change affects layout or the figure, open `index.html` in a browser
   and look at it, at desktop width and at 375px.
5. Commit `index.html` with a message describing the change in the requester's
   terms, not in terms of the array you edited.

Pushing to `main` publishes the site automatically through
`.github/workflows/deploy-pages.yml`, which runs the checker first and refuses
to deploy if it fails.

## Verifying, honestly

Two traps have already caught someone working on this page:

- **A duplicate `id` does not throw.** `getElementById` returns the first
  match in document order, so the script silently drives the wrong element.
  The checker catches this; do not remove that check.
- **A hidden browser tab freezes `requestAnimationFrame` and CSS
  transitions.** The figure then renders empty and computed styles return
  pre-transition values — both look exactly like bugs. Check
  `document.hidden` before diagnosing anything visual.

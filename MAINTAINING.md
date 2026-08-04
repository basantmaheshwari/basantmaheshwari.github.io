# Maintaining this website

Everything you need to change <https://basantmaheshwari.github.io/basantmaheshwari/>.
If you only want to request a change, you do not need this file — see
[README.md](README.md) or just open an issue.

One self-contained `index.html`. No build step, no framework, no CDN, no web
fonts, no external resources of any kind — the page opens correctly from a
file:// URL with the network off.

## Changing the site without touching code

This repository is set up so that the site can be maintained by describing
what you want in plain English. You do not need to know what HTML is.

1. Go to the **Issues** tab and press **New issue**.
2. Pick the form that fits:
   - **Add a publication** — a new paper. A DOI is enough; everything else is
     looked up from it.
   - **Add a news item** — an event, visit, award or milestone.
   - **Request a website change** — anything else: wording, a correction, a
     new section, a photograph.
3. Fill it in and submit.

A website editor or an AI coding assistant picks the issue up, makes the
change, and opens a pull request. When that is merged the site republishes
itself within a minute or two.

**One thing to know:** anything you do not supply will be left out rather than
guessed. That is deliberate — this is an academic record, and an honest gap is
much better than a plausible invention. If a date, a co-author or a number
matters, put it in the form.

## Changing the site with code

All content lives in data arrays at the top of the `<script>` block. The
markup is generated from them, so you never edit HTML to add an entry.

| Array          | Drives                                                      |
| -------------- | ----------------------------------------------------------- |
| `SECTIONS`     | The rail, the mobile menu and the panel engine               |
| `METRICS`      | The four figures on the profile page                         |
| `RESEARCH`     | Research themes                                              |
| `PROGRAMS`     | MARVI, AIWC, Young Water Professionals, dam safety training  |
| `TEACHING`     | Teaching and capacity building                               |
| `NEWS`         | News items, newest first                                     |
| `CONTACT`      | Contact channels and profile links                           |
| `PUBLICATIONS` | The publication list                                         |

A publication entry is terse because there are many of them:

```js
{y:2026, t:"Title as published", a:"Family, I., Family, I.", v:"Journal name",
 d:"10.1002/wwp2.70094", c:2},
```

Write his own name exactly `Maheshwari, B.` — the renderer matches that string
to set it in bold.

`AGENTS.md` is the full brief, including the editorial rules. Read it before
making a change.

## Checking it

```sh
node checks/verify.mjs
```

There is no compiler here, so this script is the compiler. It refuses the
deploy if the page would be broken or would stop being self-contained:

- an external resource crept in — a CDN script, a web font, a remote image
- a duplicate `id` (which does **not** throw; `getElementById` silently
  returns the wrong element, and this has already caused one real bug)
- a content array that no longer parses
- a nav entry with no matching panel, so the link goes to a blank page
- a malformed or duplicated DOI
- an `<img>` with no alt text, a missing `lang`, an unreplaced placeholder

It was tested by breaking the file nine different ways; all nine were caught.
Errors block publication, warnings do not.

## Publishing

Merging to `main` runs `.github/workflows/deploy-pages.yml`, which runs the
checker, copies `index.html` into `_site/`, and deploys to GitHub Pages. Pages
for this repository is configured with build type **workflow**, so this file is
mandatory — pushing `index.html` on its own would publish nothing.

Everything except `index.html` is editor tooling and is deliberately not
published.

## The publication list

The 68 entries in `PUBLICATIONS` are generated from
[ORCID 0000-0002-5496-4345](https://orcid.org/0000-0002-5496-4345) and enriched
from [Crossref](https://api.crossref.org/) for authors, venues and citation
counts, so every entry resolves to a registered DOI.

It is therefore a subset. The full record of more than 230 publications —
including book chapters, conference papers and reports without a DOI — is on
[Google Scholar](https://scholar.google.com/citations?user=g8Pn5w0AAAAJ&hl=en),
which the page links to prominently rather than pretending to be complete.

## The figure on the profile page

The cross-section is a hydrogeological section whose water table is **solved,
not drawn**. For steady unconfined flow between two fixed heads with areal
recharge `N` over an aquifer of conductivity `K`, the Dupuit–Forchheimer
equation gives

```
h(x)² = h₁² + (h₂² − h₁²)·x/L + (N/K)·x·(L − x)
```

The final term is the recharge mound: identically zero at both boundaries,
greatest in between, and proportional to `N`. Driving `N` through a monsoon
rise and a Maillet exponential recession makes the mound grow and drain, and
two of the six monitored wells go dry at the low point.

That is the argument the MARVI work makes, drawn in the notation of his own
field: recharge does not raise the boundaries, it raises everything between
them — which is why a check dam shows up as water in a well some distance away.

Verified by recovering `N/K` from the rendered SVG path and re-solving: the
maximum residual across the curve is 1.2 cm, which is exactly the rounding
budget of the path coordinates. An independent reimplementation in Python
produced byte-identical geometry.

## Still to fill in

- **Unit codes and course convening.** `TEACHING` describes supervision and
  capacity building; specific teaching was not in any source consulted.
- **Completed HDR candidates.** No list of graduated students was available,
  and inventing one is not an option.
- **Awards and fellowships.** Almost certainly substantial, but nothing was
  verifiable at the time of writing, so there is no Awards section yet.
- **A photograph with a clear licence.** The current portrait is his official
  AIWC profile photograph, embedded as a data URI.

Each of these is one issue away from being fixed.

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
| `TEAM_ROLES`   | The My team sections, their order and empty states           |
| `TEAM`         | The people in the group                                      |
| `PUB_KINDS`    | The Publications sections, their order and empty states      |
| `PUBLICATIONS` | The publication list                                         |

A publication entry is terse because there are many of them:

```js
{k:"journal", y:2026, t:"Title as published", a:"Family, I., Family, I.",
 v:"Journal name", d:"10.1002/wwp2.70094", c:2},
```

`k` is the section it files into and must be one of the `PUB_KINDS` ids —
`journal`, `conference`, `thesis`, `other`. `a`, `d` and `c` are optional: an
entry with no DOI is listed without a link (correct for theses and older
conference papers), and one with no author list omits that line rather than
inventing one.

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
- a publication whose `k` — or a person whose `r` — is not a declared kind or
  role, which would render into no section at all and silently disappear
- collapsible sections that have lost the code which opens them on a search,
  or a `<details>` with no `<summary>` to open it — both leave content that
  the page insists exists but never shows
- an `open:` that is not literally `true` or `false`
- a filter container that has lost its `chip-filter` class, which leaves the
  chips stacking down the page instead of scrolling across it, with nothing
  thrown and nothing obviously wrong in the DOM
- a malformed or duplicated DOI (a missing one is fine — it just isn't linked)
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

102 entries, 1986–2026, generated from
[ORCID 0000-0002-5496-4345](https://orcid.org/0000-0002-5496-4345) and enriched
from [Crossref](https://api.crossref.org/) for authors, venues and citation
counts: 94 journal articles, 7 conference papers, 1 other output, 0 theses.

86 carry a registered DOI and link to doi.org. The other 16 are in his ORCID
profile without one; a Crossref title search recovered 21 of the 37 that were
missing, at a 0.93 title-similarity threshold with a year check. The 16 that
did not clear that bar are listed with title, venue and year only — **no
authors were invented for them**, and a weak match was treated as no match,
because a wrong attribution is worse than a thin entry.

Kind comes from the Crossref or ORCID work type, except that a venue naming a
conference, congress, proceedings or symposium wins — several proceedings
papers are typed `journal-article` upstream, and the venue is the reliable
signal.

It remains a subset of a record of more than 230 outputs. The complete list is
on [Google Scholar](https://scholar.google.com/citations?user=g8Pn5w0AAAAJ&hl=en),
which the page links to prominently rather than pretending to be complete.

One known data problem, inherited from ORCID and left as-is rather than
guessed at: *Infiltration and roughness equations for surface irrigation* is
dated 1998 but its venue is given as the *2001 ASAE Annual Meeting*. One of
the two is wrong. It is one issue away from being fixed.

## Collapsible publication sections

The four publication sections start **shut**, which takes the page from about
12,400px to 1,200px. They are `<details>` elements, so opening and closing is
the browser's own behaviour — keyboard, screen readers and find-in-page all
work without any script.

Whether a section starts open is data. Put `open:true` on its `PUB_KINDS`
entry and it will be expanded on arrival:

```js
{id:"journal", label:"Journal articles", open:true, empty:"…"},
```

Three things happen automatically and should stay that way:

- **A search opens whatever it matches.** Searching *rajasthan* expands
  Journal articles and shows 7 of 94; searching *imacs* expands Conference
  papers instead. Without this the counter would report results while the list
  looked empty, with nothing thrown.
- **Choosing a single kind opens it**, since that is an explicit request to
  see it.
- **Printing opens everything**, then puts it back. A shut section prints as a
  heading with nothing underneath, which would silently drop most of a printed
  publication list.

Anything you opened by hand stays open when you clear a search.

## The Team page

Four sections — postdoctoral researchers, PhD candidates, collaborators, other
members — driven by `TEAM_ROLES` exactly the way the publication sections are
driven by `PUB_KINDS`, and filtered by the same `wireFilteredGroups` code.

**The sections are not fixed.** Adding *Alumni*, *Masters students* or
*Visiting researchers* means adding one object to `TEAM_ROLES` and tagging
people with its id; the chips, headings, counts and empty states all follow.
The "Add or update a team member" issue form offers *a new section* as an
option, so this can be asked for in plain language.

The postdoc and PhD sections are **empty on purpose**. No public page lists his
current postdocs or doctoral candidates, and the available signal — who
co-authors with him most often — is not evidence of supervision. Filling those
sections by inference would have put wrong roles against real people's names,
so they show an empty state and an invitation instead.

The five people currently listed are those named on the
[MARVI participants page](https://www.westernsydney.edu.au/marvi/our-people) at
Western Sydney University, carrying the titles that page gives them. Those
holding a chair sit under *Collaborators* rather than as members of the group —
a senior academic listed beside a research group is a peer, not a member of it.
The note under the list states all of this, so nothing is presented as more
current or more specific than its source.

The **Add or update a team member** issue form has a consent checkbox, because
this section names living people rather than citing published work.

## Adding a page

Pages are data. Add a `page` object to a `SECTIONS` entry and the panel builds
itself — rail entry, mobile menu, `#hash` route, watermark numeral and all:

```js
{id:"awards", label:"Awards", tc:"08", page:{
  title:"Awards.",
  lede:"One sentence under the heading.",
  blocks:[
    {tag:"Recent", heading:"A block heading.", paragraphs:["A paragraph."]},
    {tag:"Selected", entries:[{name:"…", year:"2025", status:"awarded", blurb:"…"}]},
  ]}},
```

Blocks are either `paragraphs` or `entries`. Profile, Publications and Team
are hand-written panels instead, because they carry a solved figure and
filtered groups that this shape cannot express; everything else can be data.

Ask for a new page in plain language through the **Request a website change**
form — "A new page" is one of the options.

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
  and inventing one is not an option. The Publications page now has a
  **Theses** section standing ready and empty for exactly this.
- **Awards and fellowships.** Almost certainly substantial, but nothing was
  verifiable at the time of writing, so there is no Awards section yet.
- **A photograph with a clear licence.** The current portrait is his official
  AIWC profile photograph, embedded as a data URI.

Each of these is one issue away from being fixed.

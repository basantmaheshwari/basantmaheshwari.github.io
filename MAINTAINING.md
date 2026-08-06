# Maintaining this website

Everything you need to change <https://basantmaheshwari.github.io/>.

## Edit the website in a browser

The editor is at **<https://basantmaheshwari.github.io/admin/>**.

Sign in with GitHub and the sidebar shows **one entry per page of the site**,
in the same order as its menu:

```
00 · Profile page        the photograph, headline and opening words;
                         and the four figures
01 · Research page       research themes
02 · Publications page   the list, and the sections it is grouped under
03 · Programmes page     MARVI, AIWC, the training programmes
04 · Team page           people, and the sections they appear in
05 · Teaching page       teaching and capacity building
06 · News page           events and milestones
07 · Contact page        contact channels
 ⚙ · Pages and menu      which pages exist, and their order
```

Opening *Publications* edits the Publications page and nothing else, so it is
always clear what a change will affect.

**The real website sits beside the form.** The editor has a *Live preview*
panel docked on the right showing the actual page — the portrait, the
typography, the water in the sidebar, the solved cross-section, every effect,
because it is the site rather than a drawing of it. Drag its left edge to
resize, *Hide* to collapse it, *Open in a tab* for a full-width look.

It refreshes a moment after each save, and updates long before the published
page does: it reads content straight from the repository rather than waiting
for the site to rebuild.

*Why a panel of our own rather than the editor's preview pane:* Sveltia
accepts a custom preview template and never renders it — registering one
leaves the pane blank. So the panel is built independently of that API and
does not depend on it.

Saving commits the change and the site republishes itself within a minute or
so. No files, no code.

> **Before it will save, someone has to set up sign-in once.** See *Setting up
> the editor* below. Until that is done the editor loads and shows the content,
> but saving fails at the sign-in step.

### How it fits together

Content lives in `content/*.json` — that is what the editor writes. The site
itself is still a single self-contained `index.html` with the content copied
inside it, so it keeps working offline and loads nothing at runtime.
`scripts/build.mjs` copies the JSON into the HTML, and the publish workflow
runs it automatically:

```
content/*.json  →  scripts/build.mjs  →  index.html  →  checks/verify.mjs  →  published
   the editor          the copy           the site         the gate
```

If you edit `content/` by hand, run `node scripts/build.mjs` afterwards. The
check refuses to publish a branch where the two disagree.

### Signing in

The editor signs in with GitHub through a small authentication service — a
static page cannot hold an OAuth secret. It currently uses an existing shared
worker, so **nothing new has to be deployed**:

```
https://sveltia-cms-auth.marvi-groundwater.workers.dev
```

If *Sign in with GitHub* refuses this origin, add
`https://basantmaheshwari.github.io` to that worker's `ALLOWED_ORIGINS` in
Cloudflare.

**Worth knowing:** that worker is not owned by this account, so if it is ever
withdrawn, sign-in here stops with it. Nothing else breaks — the website, the
content and the publishing pipeline are all in this repository and carry on
regardless. Two ways out when it matters: Sveltia's personal access token
button needs no worker at all, or the same open-source worker can be deployed
on Basant's own Cloudflare account and `base_url` pointed at it.

Anyone who should be able to edit needs write access to the repository.

## Or revise it with a chat

The editor covers content. For anything structural — a new kind of page, a
change to how something looks — describe it to a coding assistant instead.

1. Open this repository in Claude Code, Codex or GitHub Copilot.
2. Describe the result you want in ordinary language. Include the page, the
   approved wording, and any dates, names or links that matter.
3. Ask the assistant to implement the change and run the website check.
4. Review the pull request, then merge it into `main`. Publishing is automatic.

The repository carries an assistant guide — [AGENTS.md](AGENTS.md) — covering
the project, the editorial direction, where every piece of content is stored,
and the checks that must pass. A set of structured forms is also available
under the **Issues** tab for colleagues who would rather submit a brief than
hold a conversation.

Example requests:

- “Add this paper to the publications list: 10.1002/wwp2.70094.”
- “Add Priya Sharma as a PhD candidate working on managed aquifer recharge in
  Rajasthan, started 2024.”
- “Put the AIWC@5 symposium on the News page using this approved wording.”
- “The Teaching page should mention the dual degree programme with IIT
  Roorkee.”
- “Show me where the publication list is maintained and how a new kind of
  publication would be added.”

**One thing to know:** anything you do not supply is left out rather than
guessed. This is an academic record, and an honest gap is far better than a
plausible invention. If a date, a co-author or a number matters, include it.

## What the CMS actually is

[Sveltia CMS](https://github.com/sveltia/sveltia-cms) — a Git-based editor. It
is a static page at `/admin/` that talks to the GitHub API in the browser:
there is no server, no database, and nothing to keep running. Every change is
an ordinary commit, so the history, review and rollback are git's.

| Piece | What it does |
| ----- | ------------ |
| `admin/` | The editor — one form per page of the site |
| `?preview` on the site | Watches the repository and redraws — the Live Site button |
| `content/*.json` | What it reads and writes |
| `scripts/build.mjs` | Copies that content into `index.html` |
| `checks/verify.mjs` | Refuses to publish a broken or unsafe change |
| `.github/workflows/deploy-pages.yml` | Builds, checks and publishes on every change to `main` |
| `.github/ISSUE_TEMPLATE/` | For colleagues who would rather file a request than edit |

The editor is the only part of the repository that loads anything from another
host — it fetches Sveltia from a CDN. `index.html` remains entirely
self-contained; the editor is a tool, not part of the published site.

## The site itself

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
| `TEAM_ROLES`   | The Team page sections, their order and empty states           |
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

## Automatic GitHub Pages publishing

Every change merged into `main` is checked and published by
`.github/workflows/deploy-pages.yml`. In the repository's **Settings → Pages**,
**Source** is set to **GitHub Actions**; that is a one-time setting and it is
already done. After that, editors only need to merge an approved change —
publishing is automatic and takes about a minute.

Because Pages is set to build from a workflow rather than to serve a branch,
that workflow file is **mandatory**: pushing `index.html` on its own would
publish nothing at all.

Only `index.html` is published. Everything else in the repository — the
checker, the guides, the issue forms — is editor tooling and is deliberately
left out of the deployed site.

The assistant runs the same check the workflow does with:

```sh
node checks/verify.mjs
```

There is nothing to install first. The site has no dependencies, so the check
has none either.

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

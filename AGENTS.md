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
| `SECTIONS`     | The rail, the mobile menu, the panel engine — and whole pages, via `page` |
| `METRICS`      | The four figures on the profile page                           |
| `RESEARCH`     | Research themes                                                |
| `PROGRAMS`     | MARVI, AIWC, Young Water Professionals, dam safety training    |
| `TEACHING`     | Teaching and capacity building                                 |
| `NEWS`         | News items, newest first                                       |
| `CONTACT`      | Contact channels and profile links                             |
| `TEAM_ROLES`   | The Team page sections, their order and their empty states       |
| `TEAM`         | The people — see the format below                              |
| `PUB_KINDS`    | The Publications sections, their order and their empty states  |
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
{k:"journal", y:2026, t:"Title as published", a:"Family, I., Family, I.",
 v:"Journal name", d:"10.1002/wwp2.70094", c:2},
```

`k` kind · `y` year · `t` title · `a` authors · `v` venue · `d` DOI ·
`c` citation count.

**`k` must be one of the `PUB_KINDS` ids** — currently `journal`,
`conference`, `thesis`, `other`. An entry with an unknown kind renders into
no section and silently vanishes from the page, so `verify.mjs` blocks on it.

`a`, `d` and `c` are **optional**. An entry with no DOI is listed without a
link, which is correct for theses and for older conference papers — a dead
doi.org link is worse than no link, because it reads as a citation the reader
can check and then cannot. An entry with no author list simply omits that
line; sixteen older records are in that state and **no author list was
invented for them**. Do not fill one in unless you have a source.

Authors are `Family, I.` separated by commas, truncated to six followed by
`et al.`. Write his own name exactly `Maheshwari, B.` — the renderer matches
that string to set it in bold, and any other spelling will silently fail to
emphasise.

Publications are listed newest first, grouped into kind sections and then by
year, both automatically. Insert a new one in year order in the array; the
kind sections are built from `k`, so position within the array only affects
ordering inside its own year.

**Choosing the kind.** Prefer the venue over the upstream type: Crossref and
ORCID both type a good number of proceedings papers as `journal-article`, and
the existing entries were classified by treating a venue naming a *conference,
congress, proceedings, symposium* or *workshop* as decisive. Follow that rule
for new entries.

**Adding a thesis.** The `thesis` section is deliberately present and empty,
showing a message rather than being hidden — it covers both supervised higher
degree theses and his own doctoral thesis. Add one as:

```js
{k:"thesis", y:2024, t:"Thesis title", a:"Candidate, A.",
 v:"PhD, Western Sydney University"},
```

Put the degree and awarding institution in `v`. If the issue does not say
whether he supervised or examined it, ask — do not assume supervision.

**Adding a new kind** (say book chapters) is two steps: add
`{id:"chapter", label:"Book chapters", empty:"…"}` to `PUB_KINDS` in the
position you want it displayed, and tag entries `k:"chapter"`. The filter
chips, the section headings and the counts all build themselves from that
array, and `verify.mjs` will then accept the new id.

### Adding a page

A page is data too. Give the `SECTIONS` entry a `page` object and the whole
panel is generated — it appears in the rail, in the mobile menu, and answers
to its own `#hash`, with no markup written anywhere:

```js
{id:"awards", label:"Awards", tc:"08", page:{
  title:"Awards.",
  lede:"One sentence under the heading.",
  blocks:[
    {tag:"Recent", heading:"A block heading.",
     paragraphs:["A paragraph.", "Another."]},
    {tag:"Selected", entries:[
      {name:"…", year:"2025", status:"awarded", blurb:"…", tags:["…"]}]},
  ]}},
```

A block is either `paragraphs` (prose) or `entries` — the same object shape
the Research and Programmes lists use. `tc` is the two-digit index shown in
the rail and as the watermark numeral; keep them in order.

The alternative is still available: write a `<section class="panel"
data-panel="…">` into the HTML by hand and leave `page` off. Do that only when
the page needs something the block shapes cannot express — Profile,
Publications and Team are hand-written because they carry a solved figure and
filtered groups. For an ordinary page, prefer the data form.

`verify.mjs` fails the build if a section has **neither** a panel in the markup
nor a `page` definition, because a nav entry with neither leads to a blank
screen: the rail still highlights it, the hash still changes, and nothing
throws.

## The forms are part of the model

`.github/ISSUE_TEMPLATE/` is the editing interface, so it has to keep step
with the data. Every `SECTIONS` label needs an option in the change form,
every `PUB_KINDS` label one in the publication form, and every `TEAM_ROLES`
label one in the team form. Add a section, kind or role and the matching
dropdown gets the same addition in the same change.

Miss it and nothing looks wrong: the site is fine, but that part of it becomes
unreportable — there is no way to file a request against it. `verify.mjs`
warns on the mismatch in either direction, reading the options list rather
than the file, because these forms also explain their options in prose and a
plain text search finds the word after the option itself has gone.

## Which files are public

This repository is named the same as the account, which makes it GitHub's
**profile repository**: `README.md` is rendered on <https://github.com/basantmaheshwari>
for anyone who visits his profile. Keep it short, public-facing and about him.

Maintenance notes belong in `MAINTAINING.md`, and instructions for you belong
here in `AGENTS.md`. Do not move either of those into `README.md`.

Only `index.html` is published to the website itself — the deploy workflow
copies that one file into `_site/`. Everything else is tooling.

## The Team page, and naming real people

A person entry:

```js
{r:"phd", n:"Priya Sharma", p:"PhD candidate",
 f:"Managed aquifer recharge in hardrock watersheds of Rajasthan.",
 w:"Western Sydney University", l:[{label:"Profile", href:"https://…"}]},
```

`r` role — one of the `TEAM_ROLES` ids (`postdoc`, `phd`, `collaborator`,
`other`) · `n` name · `p` position · `f` what they work on · `w` institution ·
`l` links. Everything except `r` and `n` is optional and omitted when absent.

**Collaborators are peers, not members of the group.** Anyone whose published
title is Professor — including Adjunct and Associate — belongs under
`collaborator` unless the issue says otherwise. Listing a chair as an "other
team member" of someone else's group misrepresents them.

**The sections are not fixed.** `TEAM_ROLES` is a data array like every other,
and requests to add one (Masters students, Visiting researchers, Alumni,
Research staff) are normal and expected — the issue form offers "a new
section" for exactly this. Adding one is two steps:

```js
{id:"alumni", label:"Alumni", empty:"No alumni listed yet."},
```

put in `TEAM_ROLES` at the position it should appear, then tag people
`r:"alumni"`. The filter chips, the section headings, the counts and the empty
states all build themselves from that array, and `verify.mjs` will accept the
new id automatically. The same is true of `PUB_KINDS` on the Publications
page. Renaming a section is just editing its `label`; the `id` can stay.

**This section names living people, so it has a stricter rule than the rest of
the site.** Add a person only when the issue explicitly supplies them, or when
a public page names them in that role. Never infer:

- A **co-author is not a student.** Do not promote frequent collaborators into
  the postdoc or PhD sections because they publish with him often.
- Do not carry a role over from another context. Someone listed as a project
  participant is a project participant, not a supervised candidate.
- The **“Add a team member” issue form has a consent checkbox** for exactly
  this reason. If an issue names someone without it, ask before publishing.
- To remove someone, delete the object. Do not leave them in with a note.

The two empty sections are empty on purpose and say so. Leave them that way
until someone supplies the names.

## Collapsible sections

The Publications sections are `<details>` and **start shut**; the Team
sections are plain `<section>` and are always open. `groupHTML({collapsible})`
is the switch, and the wiring reads which one it got from the tag name, so the
two cannot drift apart.

Whether a given publication section starts open is data, not code — put
`open:true` on its `PUB_KINDS` entry:

```js
{id:"journal", label:"Journal articles", open:true, empty:"…"},
```

It must be a literal `true` or `false`; `verify.mjs` blocks anything else,
because `"no"` and `0` are truthy or falsy by accident rather than on purpose.

**The one rule you must not break: a search has to open whatever it matches.**
If a shut section keeps its matches hidden, the reader types a query, the
counter says results exist, and the list looks empty — with nothing thrown and
nothing in the console. `apply()` therefore forces a group open when a search
has found something in it, or when the filter has narrowed to it alone, and
otherwise returns it to the reader's last choice (or the section default).
`verify.mjs` fails the build if collapsible markup ever exists without the code
that opens it.

The reader's own open/shut choice is recorded on **click**, not on the
`toggle` event: `toggle` fires asynchronously and also fires when the script
sets `open` itself, so it cannot tell the reader's intent from the code's.

Everything opens for printing and returns afterwards, because a shut section
prints as a heading with nothing under it — which would quietly drop most of
the publication list from a printed CV.

## Filtered groups: one pattern, two panels

Publications and My team use the same interaction and therefore the same code,
`wireFilteredGroups`. A panel opts in by rendering this markup:

```html
<section class="group" data-kind="ID">
  <div class="group-head"><h2>…</h2><span data-role="count"></span></div>
  <p class="group-empty" hidden>…</p>
  [<div data-subgroup>]  <x data-item data-search="…">  [</div>]
</section>
```

`data-subgroup` is optional — Publications uses it to band by year, My team
has no second level. The chip row must carry `class="chip-filter"` and the
chips are generated by `renderChips`.

If you change one of these class names, change it in **both** the stylesheet
and the markup. A container that keeps its id but loses `chip-filter` still
works — the script finds it, filtering still filters — but it never becomes a
flex row, so the chips silently stack down the page instead of scrolling
across it. Nothing throws. `verify.mjs` blocks on this specific case because it
has already happened once.

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

## The water drawings, and the one number pair not to touch

Two drawings share one model, `AQUIFER` and `SEASON`, declared just above the
cross-section in the script:

- **The cross-section** on the profile page.
- **The rail**, which is a monitoring well sunk at `x = L/2` — the centre of
  the watershed, where the recharge mound is highest. The left boundary would
  be the obvious place and is exactly wrong: it is a fixed-head boundary, so
  its level never moves.

Both read phase from absolute time rather than from a first-frame origin, so
they stay on the same season without either knowing the other exists. If you
change `SEASON`, both change together — that is the point, and it is why the
level in the sidebar can never contradict the mound in the figure.

**The rail's wash alpha and the rail's text colours are a coupled pair.** The
navigation sits at 4.65:1 against bare paper, which is barely over the 4.5:1
minimum, so a tint of any strength laid under it fails. The rail therefore
scopes its own `--muted: #526169` and `--faint: #6b7981`, a shade darker than
the page defaults, which buys the wash its contrast back — measured 4.67:1
over the deepest part. **Raising the alphas without darkening those colours
puts the navigation under the minimum.** Both carry a comment saying so.

`TOP_M` in the rail is a framing choice, not physics: it sets which elevation
is drawn at the top of the rail, and therefore how far down the water table
sits. It was raised to 44 m so the table falls below the navigation rather
than crossing it.

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

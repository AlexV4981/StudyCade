# Interactive chemistry references in StudyCade Markdown

StudyCade's chemistry reference tools are **actual local web pages**, not SVG images with JavaScript and not embeds inside an untrusted Markdown document. Every public link opens in a separate browser tab, keeping the study notes and progress intact. No login, image API, or external service is required.

## Working Markdown links

Use ordinary Markdown anchor links with the exact locally supported paths:

```md
[Explore the interactive periodic table](/interactive/periodic-table)
[Inspect sodium in the periodic table](/interactive/periodic-table?element=Na)
[View group 17](/interactive/periodic-table?group=17)
[Explore the general atomic-radius trend](/interactive/periodic-table?trend=radius)
[Explore ionization-energy direction](/interactive/periodic-table?trend=ionization)
[Explore electronegativity direction](/interactive/periodic-table?trend=electronegativity)
[Explore periodic trends illustration](/interactive/diagram?id=periodic-trends)
[Explore a titration apparatus](/interactive/diagram?id=titration-setup)
[Inspect the burette in the titration diagram](/interactive/diagram?id=titration-setup&point=burette)
```

These links are only navigation references. They are **not evidence**, and the tool must never supply missing quantities, solutions, formulas, professor-specific conventions, measurements, or original slide data. Continue to cite the supplied lecture in a separate `[!SOURCE]` block.

### Inside a StudyCade RECALL question

Put each link on a quoted line, so the link stays inside the practice question rather than becoming an unrelated paragraph:

```md
### [CHEM] Q1 · Rank three atomic radii

> [!RECALL]
> According to the supplied lecture, the neutral atomic radii are
> sodium = 160 pm, magnesium = 140 pm, and chlorine = 100 pm.
> Rank them from largest to smallest and explain the direction using periodic trends.
> [Explore the periodic table with Na selected](/interactive/periodic-table?element=Na&trend=radius)

> [!ANSWER]
> Sodium > magnesium > chlorine.

> [!SOLUTION]
> The given values satisfy 160 > 140 > 100 pm. The general trend
> across period 3 is decreasing atomic radius.

> [!SOURCE]
> Example practice based on the supplied Chapter 9 periodic-trend material.
> The interactive table is supplemental navigation, not a numerical-data source.
```

The learner can solve the problem even if the link is unavailable. The tool adds no additional chemical facts to the question.

## Periodic table: supported interactions

- All **118 element buttons** are keyboard accessible; clicking selects an element with atomic number, name, symbol, family, and period/group or f-block series.
- Search elements by name, symbol, or number; filter by family and group.
- Qualitative trend views: **atomic radius**, **first ionization energy**, and **electronegativity**. These are general trends with exceptions; no fabricated numeric heatmap is shown.
- Copy the current view's link for a note, quiz question, or message.
- Opens directly via `/interactive/periodic-table` from browser address bar or Markdown, and works with regular browser history.

## Diagram explorer: supported interactions

- All **39 non-periodic-table diagrams** support independent zoom, scrolling on smaller screens, selection by topic, and copying a direct deep link.
- Guided clickable hotspots are available for periodic trends, atomic structure, sodium electron shells, orbital filling, energy levels, ionic bonding, Lewis water, pH, titration setup/curve, heating curves, and activation energy.
- Other diagrams retain accurate, descriptive metadata and zoom controls without pretending to have detailed clickable scientific annotations that have not been authored.

Use the existing same-origin PNG/SVG image syntax if you need a *static figure*, e.g., `![Periodic trend overview](/assets/chemistry/periodic-trends.svg)`. To open the interactive explorer use `[Explore periodic trends](/interactive/diagram?id=periodic-trends)`, not image syntax or raw HTML.

## Security boundaries

Only these exact routes are recognized:

- `/interactive/periodic-table`, optional `element`, `group` and `trend` query parameters
- `/interactive/diagram`, required known diagram `id` and optional known `point`

Query strings are validated against the existing 118-element and 40-diagram catalogs. Unknown or unsafe interactive Markdown links are shown as **unavailable** rather than followed. Study content cannot provide executable scripts, remote embeds, iframe sources, arbitrary file paths, redirect URLs or fake element data through these links.

The pages themselves are public, read-only front-end tools. They do not read guest IndexedDB data, cloud sessions, tokens, saved answers, imported notes or account information. The original SVGs are local, self-contained artwork.

## Study prompt behavior

In Prompt Studio, **Add links to interactive chemistry references** is on by default and can be disabled separately from **Use built-in chemistry images or verified online images**. When chemistry material is selected, StudyCade includes exact links relevant to the material. The prompt prohibits invented links and repeats that the source notes, not the interactive viewer, must support every answer.

## Testing and deployment

The feature-specific CI workflow executes the frontend unit tests, source privacy scanner, production Vite build and disposable FastAPI smoke tests. This includes tests for valid/invalid interactive links, 118 unique periodic-table positions, focus-point stability, and direct server-side URL access. The same checks should pass before promoting this branch. The tool needs a browser walkthrough for responsive layouts and focus/keyboard behavior before production rollout.

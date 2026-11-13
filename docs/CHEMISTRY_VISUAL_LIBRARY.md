# Chemistry visual library

StudyCade bundles **158 original, self-contained SVG illustrations** for general chemistry: **40 topic diagrams** and **118 atomic-number element tiles**. They live under `frontend/public/assets/chemistry/` and render directly as local Markdown images. No external network, AI model, authentication, or image API is needed.

The complete machine-readable registry is [catalog.json](../frontend/public/assets/chemistry/catalog.json). The source-of-truth metadata is [chemistry-library.js](../frontend/src/chemistry-library.js), and [the generator](../scripts/generate-chemistry-assets.mjs) creates every SVG reproducibly.

## Coverage

| Section | Examples in the 40 diagrams |
| --- | --- |
| Periodic table and elements | All 118 numbered symbols, family colors, periodic trends, isotope notation |
| Atomic structure and quantum theory | Atom, sodium shell model, s/p orbital shapes, electron-filling diagram, photon energy, transitions |
| Bonding and molecular shape | Ionic/covalent bonds, water Lewis structure, VSEPR, hydrogen bonding |
| Stoichiometry | Mole conversion, equation balancing, limiting reactant, reaction types, mass-to-mass |
| States and gases | Particle models, water heating curve, generic phase diagram, Boyle/Charles laws, ideal gas |
| Solutions and acids/bases | Molarity, dilution, solubility, ion hydration, pH, titration setup and curve |
| Thermochemistry and kinetics | Calorimetry, reaction enthalpy, Hess's law, activation barriers |
| Equilibrium and electrochemistry | Dynamic equilibrium, redox, zinc-copper galvanic cell |
| Nuclear and lab basics | Alpha/beta/gamma emissions, glassware |

These are educational **schematics**, not photos or experimental measurements. Some trends have exceptions; plots labeled illustrative should not be treated as measured datasets. Atom/shell diagrams are simplified visual models, not electron trajectories. Element tiles show the number, name, symbol and broad family, **not** the physical appearance of an element.

## Use a bundled diagram in imported Markdown

```md
# [CHEM] Periodic table essentials

## [CHEM] Periods and groups

![All 118 element symbols and numbers](/assets/chemistry/periodic-table.svg)

### [CHEM] Q1 · Identify group 17

> [!RECALL]
> Which group includes fluorine and chlorine?
> ![All 118 elements arranged by group](/assets/chemistry/periodic-table.svg)

> [!ANSWER]
> Group 17, the halogens.
```

For an element card, use `/assets/chemistry/elements/008-o.svg` for oxygen or `/assets/chemistry/elements/026-fe.svg` for iron. These are stable same-origin paths, served by the existing static-asset route. External HTTPS links are still consent-gated by the Markdown reader.

## Interactive views

Every bundled chemistry illustration now offers an **Explore interactively** link when displayed in Markdown. The [interactive chemistry tools](INTERACTIVE_CHEMISTRY.md) provide a clickable 118-element periodic table, qualitative trend modes, and zoomable diagrams with guided hotspots for selected topics. In Prompt Studio the gallery can copy exact Markdown links to these tools as well as static images.

## Search and choose illustrations

In **Prompt Studio**, expand **Browse built-in chemistry images**. Search by topic, category, element name or symbol. Use **Copy Markdown image** to copy a ready-to-insert `![alt](path)` reference.

When chemistry source material is selected and **Include verified online images when useful** is checked, the study prompt now prioritizes a short topic-matched list of actual bundled paths before recommending an internet search. It instructs the model never to invent a path, claim an element tile is a photograph, or make essential facts depend on an illustration.

## Verified external stock photo references

The registry also tracks **10 Wikimedia Commons file description pages** for real element samples, laboratory apparatus and public-domain periodic charts. Their file pages, creators and reported CC0 1.0 license are recorded separately from the SVGs. These are **external reference links only**; no photo binaries are copied into this repository or downloaded silently. Visit each file page to obtain the original image and review license, accuracy, and suitable reuse.

- [Element samples — Arònel123](https://commons.wikimedia.org/wiki/File:Element_samples.jpg): photographed sample set (Al, Cu, Zn, Ga, Nb, In, C, P, S)
- [Sodium sample — Nefronus](https://commons.wikimedia.org/wiki/File:Sodium_sample.jpg): metal with a fresh shiny cut
- [Copper crystal — 范皓程](https://commons.wikimedia.org/wiki/File:Copper_crystal.jpg): an electro-grown crystal
- [Titration setup — Alyc321](https://commons.wikimedia.org/wiki/File:Titration_of_sulphites_-_initial_step_of_titration.jpg)
- [Ascorbic-acid titration — I zeneizi](https://commons.wikimedia.org/wiki/File:Ascorbic_acid_titration_on_juices_-_the_tools_and_reagents.jpg)
- [Laboratory volumetric flask — Goodymeraj](https://commons.wikimedia.org/wiki/File:Laboratory_apparatus_01.jpg)
- [Heating flask — Jahra Tasfia Reza](https://commons.wikimedia.org/wiki/File:Laboratory_experiments.jpg)
- [Laboratory view — Hussy~B](https://commons.wikimedia.org/wiki/File:Chemistry_lab_01.jpg)
- [Simple periodic table — Offnfopt](https://commons.wikimedia.org/wiki/File:Simple_Periodic_Table_Chart.svg)
- [Basic periodic table — SCB2024](https://commons.wikimedia.org/wiki/File:Basic_Periodic_Table.jpg)

## Provenance and review

Generated diagrams are original artwork released under **CC0-1.0**. The element names and symbols were checked against [IUPAC's element references](https://iupac.org/what-we-do/periodic-table-of-elements/); NIST's [periodic table](https://www.nist.gov/pml/periodic-table-elements) is a supplemental scientific reference, not a copied image. Reusing an externally sourced photograph is governed by the license on its **individual** file description page, not the license of StudyCade's original illustrations. No trademark, source photo, or restricted stock image has been copied into the SVG set.

The generator is deterministic and offline:

```sh
node scripts/generate-chemistry-assets.mjs
node scripts/generate-chemistry-assets.mjs --check
```

The chemistry asset workflow also parses every SVG as XML, checks for scripts/external references and commits only under `optimization-and-updates`. The existing frontend tests ensure the catalog paths exist, and the Markdown renderer's security rules remain in force. Manual review of scientific diagrams and actual browser image appearance remains recommended before a production release.

## Limitations

- No element specimen photo is created for synthetic or inaccessible radioactive elements. The element tiles are reference symbols, not photographs.
- Photos in the curated external list are not bundled and will open their original file pages.
- These diagrams are designed for broad general chemistry. Quantitative problems should rely on their supplied source data and properly labeled units; the pictures are explanatory only.
- New images require adding topic metadata and a corresponding purpose-built scene in the generator, then regenerating and testing. Do not use a generic diagram for a different scientific concept just to fill space.

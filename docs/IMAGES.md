# Markdown images in StudyCade

StudyCade renders images referenced with standard Markdown in imported notes, inside `[!RECALL]` questions, in hints/solutions, and in MCQ questions. The image file itself is **not** imported, uploaded, proxied, cached, or stored in a workspace; the Markdown keeps its link.

StudyCade also bundles a searchable [chemistry visual library](CHEMISTRY_VISUAL_LIBRARY.md) containing all 118 element reference tiles and 40 common-topic diagrams. These exact same-origin SVG paths display immediately and do not require any internet connection.

## Interactive chemistry links

Bundled chemistry images include an **Explore interactively** link to a local tool. Existing Markdown documents need no edits to receive that button. You may also write ordinary internal links such as `[Explore the periodic table](/interactive/periodic-table)`; see [Interactive chemistry](INTERACTIVE_CHEMISTRY.md) for validated link formats and safety constraints.

## Supported sources

- **App-bundled assets:** same-origin paths under `/assets/`, `/subjects/`, and `/mathlive/` may display immediately. For example: `![Biology subject illustration](/subjects/biology.svg)`.
- **External images:** direct, publicly accessible `https://` image URLs are eligible, excluding localhost/internal domains, IP-literal hosts, embedded credentials, insecure HTTP, and unsupported schemes. StudyCade shows a preview placeholder and a **Load image** button rather than requesting the image automatically.
- **Unsupported sources:** `file:`, `data:`, `javascript:`, `http:`, protocol-relative links, private-host addresses, and relative attachment paths become non-loading placeholders. A `.png` or `.jpg` file beside an uploaded `.md` is **not** uploaded with it.

Remote image loading causes the visitor's browser to connect to the chosen external host, which may observe the visitor's IP address. The request uses `referrerPolicy="no-referrer"`; StudyCade does not forward its study text or cloud tokens. Use only trusted sources and consider source rights and hotlinking restrictions. Image URLs might stop working; the question and learning material should remain usable without the picture.

## Putting an image in a practice question

Use the same Markdown `![meaningful alt description](image URL)` syntax **inside** a `[!RECALL]` block (prefix each line with `>`). Do not wrap it in raw HTML. Follow with the usual `[!ANSWER]`, optional `[!SOLUTION]`, and `[!SOURCE]` blocks. Place the original source page, photographer/illustrator, and license in `[!SOURCE]` when verified.

Example using a bundled illustration:

```md
## [BIO] Cell basics

### [BIO] Q1 · Describe the major cell structures

> [!RECALL]
> What structures are commonly found in a eukaryotic cell?
> ![Biology illustration](/subjects/biology.svg)

> [!ANSWER]
> A nucleus, cytoplasm, and a cell membrane; many cells also have organelles.

> [!SOURCE]
> Image provided with the StudyCade app; source-specific licensing is in the asset manifest.
```

For a third-party picture, use its **verified direct HTTPS image URL** instead of the bundled path, and cite the real source page. An article URL or search-result URL is not a direct image URL. Never invent a link. A broken image should not prevent the learner answering the question from its text.

## Generating Markdown with a model

In **Create a better study file**, enable **Include verified online images when useful** (default on) to instruct your selected AI model to search for a relevant image **only when that model has web access**. StudyCade does not make those searches itself. The prompt asks for a verified direct HTTPS link and source attribution, never a guessed URL or unrelated stock image; it also asks that image search terms exclude private notes and account information. Uncheck the option to preserve the original images in notes without requesting new ones.

If the model cannot browse or cannot verify a public direct image link, it should leave out the new image instead of fabricating one. Review image links, attribution, alternate text, and all questions before importing the generated Markdown.

## Verification

Automated checks cover URL allowlisting, escaped alt text, remote-image opt-in placeholders, rendering inside RECALL, preserved import text, MCQ Markdown parsing, and the image CSP. They **do not** guarantee an external site currently serves an image, allows hotlinking, grants reuse rights, or remains available. Run a manual browser smoke test with a licensed public image and confirm it only requests the resource after clicking **Load image**, then check a blocked/broken URL and a bundled image.

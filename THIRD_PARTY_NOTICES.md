# Third-party notices

StudyCade includes upstream development-tool instructions and licensed public assets. Vendored skills are **agent tooling**, not product runtime behavior or a claim that this application was authored by their maintainers.

| Material | Upstream project | License / attribution |
| --- | --- | --- |
| Graphify skill and reference files under `.agents/skills/graphify/` | [Graphify-Labs/graphify](https://github.com/Graphify-Labs/graphify), revision family `v8` | [Apache 2.0](.agents/licenses/GRAPHIFY-APACHE-2.0.txt), [upstream notice](.agents/licenses/GRAPHIFY-NOTICE.txt) and [bundled MIT notice](.agents/licenses/GRAPHIFY-MIT.txt) |
| Code simplification, quality review and context engineering instructions under `.agents/skills/` | [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) | [MIT License](.agents/licenses/ADDYOSMANI-MIT.txt), Copyright (c) 2025 Addy Osmani |
| DMSans and Space Grotesk fonts | Their respective public font projects | Original OFL notices are preserved alongside files under `frontend/public/fonts/` |
| Bundled MathLive/KaTeX font assets | MathLive / KaTeX | Original upstream notice is preserved at `frontend/public/mathlive/NOTICE.txt` |
| Subject illustrations | See `frontend/public/subjects/licenses.json` | Asset-by-asset provenance and licensing is retained in that manifest |

The Graphify CLI is installed in the branch's CI job from the upstream `graphifyy` PyPI package; the repository does not vendor the CLI code. Third-party licenses remain in effect when reusing or redistributing these files.

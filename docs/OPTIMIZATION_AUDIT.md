# StudyCade optimization audit

**Working branch:** `optimization-and-updates` (branched from `main` at `a1390db07f7a606403a7daddfdad23f8914770be`).

## Tooling
- Graphify skill and eight upstream references are vendored under `.agents/skills/graphify/`, from `Graphify-Labs/graphify` `v8`.
- Addy Osmani's upstream `code-simplification`, `code-review-and-quality`, and `context-engineering` skills are under `.agents/skills/`.
- A branch-only CI workflow runs a real `graphifyy` installation in **code-only** mode, without cloud LLM services, and commits `graphify-out/graph.json` and `GRAPH_REPORT.md` only after frontend tests/build succeed. This indexes code, **not** semantic content of docs/media.
- Changes to skill upstream are not auto-synced; review before updating.

## Redundancy assessment

| Candidate | Evidence | Decision |
| --- | --- | --- |
| `frontend/src/api.js`, `guest.js`, `cloud.js` | Shared `api` names but distinct dispatch, local persistence, remote session queueing and errors | Keep separate |
| `frontend/src/exam.js`, `backend/content.py`, `backend/cloud_state.py` | Different client/backend trust boundaries | Preserve server-side validation |
| `frontend/src/guest.js`, `frontend/src/cloud.js` cloning | Cloud handles `undefined` differently from guest | Keep distinct without equivalence tests |
| `frontend/src/engine.js`, `recall.js` shuffle | Recall RNG injection and clamping vs normal shuffle | Preserve both; characterize with tests |
| `frontend/src/reading.js` latest note | Filters then reduces, parsing timestamps repeatedly and creating an intermediate array | Simplified to one pass, preserving filtering, stable tie-breaking and null fallback |
| Large UI/storage files | `main.jsx`, `guest.js`, `Notes.jsx`, `Games.jsx` each carry substantial surface area | Investigate extraction only with caller and regression coverage; size alone is not redundancy |

No verified exact multi-line duplicated block justifies deleting authentication, validation, or persistence behavior.

## Added regression tests

- `frontend/src/reading.test.js`: latest-note selection, equal dates, section fallback.
- `frontend/src/engine.test.js`: pairs, options, state resume, import/export roundtrip.
- `frontend/src/exam.test.js`: exact schema, answers, submit, scoring and immutability.
- `frontend/src/recall.test.js`: timing clamping, deck isolation, answer resolution and ambiguity.

These tests were added **before verification**. Check GitHub Actions for the actual execution result. Documentation does not claim tests pass without a successful run.

## Quality gate and future work

1. Inspect `graphify-out/GRAPH_REPORT.md` and traverse relevant graph neighbors before refactoring.
2. Validate new tests, build, backend compatibility, and cloud/guest isolation. Add coverage for queue ordering and save-version conflicts before touching storage adapters.
3. Treat behavior-preserving simplifications as small, separate changes; run checks after each and roll back on errors.
4. Never merge or push to `main`, change the live Render deployment branch, or use production secrets as part of this optimization.

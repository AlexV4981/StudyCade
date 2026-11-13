# StudyCade source graph and redundancy review

**Baseline:** [main at a1390db0](https://github.com/AlexV4981/StudyCade/tree/a1390db07f7a606403a7daddfdad23f8914770be). **Method:** reviewed module imports and selected source code using the principles of Addy Osmani's [code-simplification](https://github.com/addyosmani/agent-skills/tree/main/skills/code-simplification), [code-review-and-quality](https://github.com/addyosmani/agent-skills/tree/main/skills/code-review-and-quality), and [context-engineering](https://github.com/addyosmani/agent-skills/tree/main/skills/context-engineering) skills.

The Graphify skill/CLI was **not installed** in the available environment. `graph.json` is a manually extracted **27-module, 57-edge source import graph**, not an official Graphify AST/call graph. Imported dynamic paths, runtime calls, and generated artifacts are not exhaustively mapped. No application code was modified; no tests/builds were executed.

## Audit verdict

| Area | Evidence | Decision |
| --- | --- | --- |
| Guest/cloud APIs | `frontend/src/api.js` dispatches; `guest.js` implements browser-local guest behavior; `cloud.js` composes remote workspace persistence and session queueing. | **Keep separate.** Similar `api`/`run` names have different jobs. |
| Validation | `frontend/src/exam.js` checks UI exam structure; `backend/content.py` accepts/parses backend imports; `backend/cloud_state.py` validates cloud workspace state. | **Keep independent boundary validation**; align contracts with tests rather than removing server checks. |
| Cloning | `guest.js` JSON-clones; `cloud.js` explicitly handles `undefined` before JSON cloning. | **Do not merge blindly**: observable edge cases differ. |
| Shuffling | `engine.js` uses `Math.random`; `recall.js` accepts an injected RNG and bounds non-finite/out-of-range values. | **Keep distinct until compatibility tests exist.** |
| Large files | `frontend/src/main.jsx` (~1777 lines), `guest.js` (~1319), `Notes.jsx` (~695), `Games.jsx` (~640). | Investigate focused extraction only after mapping callers; file length alone is not proof of redundant logic. |
| Repeated code | Targeted checks found no obvious exact 5–6-line cross-file repeats in the inspected source. | **No safe deletions justified** solely on this evidence. |
| Test safety | `frontend/package.json` defines `node --test src/*.test.js`, but the reviewed source tree has no matching test files. `docs/DEVELOPMENT.md` also flags the gap. | **Add characterization tests first**; do not claim a passing suite. |

## Next incremental actions

1. Add executable characterization tests for `exam.js`, `reading.js`, `study.js`, `recall.js`, and `engine.js` (highest-value pure modules).
2. Capture guest/cloud storage isolation, session-generation invalidation, queue ordering, workspace version conflicts, and error behavior before refactoring adapters.
3. Use `docs/graph.json` to examine dependency neighbors and check callers. For each candidate simplification, document behavioral equivalence and verify one change at a time.
4. Run `cd frontend && pnpm test && pnpm build`; perform backend and guest/cloud manual checks from `docs/DEVELOPMENT.md` where the environment is configured. If checks cannot run, leave application code unchanged.
5. Keep review and application refactors separate; do not change credentials, SQL authorization rules, or the production deployment branch as part of code cleanup. Require human review before merge.

## Graph interpretation

Every edge is a source-to-imported-module relationship tagged `EXTRACTED` from visible source imports, not an inferred business-flow or proof of runtime execution. Rebuild from source after commits change. The file is intended as a focused orientation map, not a claim of Graphify-equivalent indexing.

## Review outcome

**Documentation-only branch. No application refactors approved without tests.** This is a deliberate application of behavior-preserving simplification and doubt-driven review, rather than reducing line counts by merging non-equivalent components.

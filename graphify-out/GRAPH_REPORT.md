# Graph Report - StudyCade  (2026-11-13)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 420 nodes · 1010 edges · 16 communities (14 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d20af51d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- main.jsx
- guest.py
- content.js
- guest.js
- with
- Games.jsx
- validateExam
- content.py
- CloudGateway
- ForcedRecall.jsx
- check_public_tree.py
- services
- validate_workspace
- 202610160001_private_cloud_workspaces.sql
- overrides

## God Nodes (most connected - your core abstractions)
1. `api()` - 39 edges
2. `run()` - 30 edges
3. `App()` - 23 edges
4. `create_guest_app()` - 22 edges
5. `Content()` - 19 edges
6. `bad()` - 19 edges
7. `restore()` - 19 edges
8. `NotesReader()` - 18 edges
9. `Games()` - 18 edges
10. `CloudGateway` - 17 edges

## Surprising Connections (you probably didn't know these)
- `deleteExam()` --calls--> `api()`  [EXTRACTED]
  frontend/src/Exams.jsx → frontend/src/api.js
- `chooseDeck()` --calls--> `api()`  [EXTRACTED]
  frontend/src/ForcedRecall.jsx → frontend/src/api.js
- `upload()` --indirect_call--> `subject()`  [INFERRED]
  frontend/src/Importer.jsx → frontend/src/guest.js
- `RenderContent()` --indirect_call--> `StudyProblem()`  [INFERRED]
  frontend/src/content.js → frontend/src/StudyProblem.js
- `create_guest_app()` --uses--> `CloudConfig`  [INFERRED]
  backend/guest.py → backend/cloud.py

## Import Cycles
- None detected.

## Communities (16 total, 2 thin omitted)

### Community 0 - "main.jsx"
Cohesion: 0.08
Nodes (53): api(), clearCloudCache(), getDeploymentConfig(), reloadCloudWorkspace(), request(), clearDeviceSessions(), downloadJson(), save() (+45 more)

### Community 1 - "guest.py"
Cohesion: 0.06
Nodes (6): CloudConfig, create_guest_app(), __call__(), guard(), security_headers(), GuestSmokeTests

### Community 2 - "content.js"
Cohesion: 0.08
Nodes (35): dependencies, katex@0.19.0, mathlive@0.111.1, react@19.3.1, react-dom@19.3.1, react-markdown@10.1.0, rehype-katex@7.0.1, remark-gfm@4.0.1 (+27 more)

### Community 3 - "guest.js"
Cohesion: 0.18
Nodes (35): addProgress(), backupPayload(), bad(), boundedArray(), cardsFrom(), clone(), run(), createIndexedDBStorage() (+27 more)

### Community 4 - "with"
Cohesion: 0.06
Nodes (36): concurrency, cancel-in-progress, group, GRAPHIFY_NO_CTA, name, runs-on, steps, name (+28 more)

### Community 5 - "Games.jsx"
Cohesion: 0.14
Nodes (23): eligiblePairs(), initial(), MODES, optionsFor(), result(), resumeRound(), shuffle(), signature() (+15 more)

### Community 6 - "validateExam"
Cohesion: 0.14
Nodes (23): clone(), createCloudApi(), createCloudStorage(), decode(), read(), examResult(), examSummary(), invalid() (+15 more)

### Community 7 - "content.py"
Cohesion: 0.17
Nodes (14): callout_blocks(), _card(), _label_document(), preview_document(), preview_exam(), safe_source_name(), _suggest_cards(), update_exam() (+6 more)

### Community 8 - "CloudGateway"
Cohesion: 0.24
Nodes (3): address_hash(), CloudGateway, email_address()

### Community 9 - "ForcedRecall.jsx"
Cohesion: 0.23
Nodes (11): ForcedRecall(), chooseDeck(), Preferences, RecallProvider(), clean(), fraction(), recallDelay(), recallPool() (+3 more)

### Community 10 - "check_public_tree.py"
Cohesion: 0.22
Nodes (4): allowed_example_email(), inspect(), main(), PublicTreeCheckTests

### Community 11 - "services"
Cohesion: 0.14
Nodes (13): key, value, services, autoDeployTrigger, dockerContext, dockerfilePath, envVars, healthCheckPath (+5 more)

### Community 12 - "validate_workspace"
Cohesion: 0.56
Nodes (10): invalid(), validate_workspace(), array(), cards(), integer(), labels(), name(), obj() (+2 more)

### Community 13 - "202610160001_private_cloud_workspaces.sql"
Cohesion: 0.43
Nodes (4): public.studycade_save_workspace(), public.studycade_workspaces, studycade_private.cloud_allowlist, studycade_private.is_cloud_member()

## Knowledge Gaps
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api()` connect `main.jsx` to `ForcedRecall.jsx`, `guest.js`, `validateExam`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `create_guest_app()` (e.g. with `CloudConfig` and `lifespan()`) actually correct?**
  _`create_guest_app()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `main.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07567567567567568 - nodes in this community are weakly interconnected._
- **Why does `react` connect `main.jsx` to `ForcedRecall.jsx`, `content.js`, `Games.jsx`, `validateExam`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Should `guest.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05580693815987934 - nodes in this community are weakly interconnected._
- **Why does `create_guest_app()` connect `guest.py` to `CloudGateway`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `content.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07681365576102418 - nodes in this community are weakly interconnected._
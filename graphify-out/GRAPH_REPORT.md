# Graph Report - StudyCade  (2026-11-13)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 389 nodes · 931 edges · 14 communities (12 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c792c2c7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- content.py
- main.jsx
- content.js
- guest.js
- with
- package.json
- validateExam
- CloudGateway
- ForcedRecall.jsx
- services
- validate_workspace
- 202610160001_private_cloud_workspaces.sql
- overrides

## God Nodes (most connected - your core abstractions)
1. `api()` - 37 edges
2. `run()` - 30 edges
3. `App()` - 23 edges
4. `create_guest_app()` - 20 edges
5. `bad()` - 19 edges
6. `restore()` - 19 edges
7. `Content()` - 18 edges
8. `NotesReader()` - 18 edges
9. `Games()` - 18 edges
10. `CloudGateway` - 17 edges

## Surprising Connections (you probably didn't know these)
- `deleteExam()` --calls--> `api()`  [EXTRACTED]
  frontend/src/Exams.jsx → frontend/src/api.js
- `upload()` --indirect_call--> `subject()`  [INFERRED]
  frontend/src/Importer.jsx → frontend/src/guest.js
- `create_guest_app()` --uses--> `CloudConfig`  [INFERRED]
  backend/guest.py → backend/cloud.py
- `create_guest_app()` --calls--> `CloudGateway`  [EXTRACTED]
  backend/guest.py → backend/cloud.py
- `validate_workspace()` --calls--> `validate_exam()`  [EXTRACTED]
  backend/cloud_state.py → backend/content.py

## Import Cycles
- None detected.

## Communities (14 total, 2 thin omitted)

### Community 0 - "content.py"
Cohesion: 0.05
Nodes (19): CloudConfig, callout_blocks(), _card(), _label_document(), preview_document(), preview_exam(), safe_source_name(), _suggest_cards() (+11 more)

### Community 1 - "main.jsx"
Cohesion: 0.08
Nodes (52): api(), clearCloudCache(), getDeploymentConfig(), reloadCloudWorkspace(), request(), Content(), chooseDeck(), Importer() (+44 more)

### Community 2 - "content.js"
Cohesion: 0.11
Nodes (32): callouts(), walk(), CONTENT_PAGE_SIZE, normalize(), RenderContent(), safeUrl(), eligiblePairs(), initial() (+24 more)

### Community 3 - "guest.js"
Cohesion: 0.18
Nodes (35): addProgress(), backupPayload(), bad(), boundedArray(), cardsFrom(), clone(), run(), createIndexedDBStorage() (+27 more)

### Community 4 - "with"
Cohesion: 0.06
Nodes (35): concurrency, cancel-in-progress, group, GRAPHIFY_NO_CTA, name, runs-on, steps, name (+27 more)

### Community 5 - "package.json"
Cohesion: 0.09
Nodes (28): dependencies, katex@0.19.0, mathlive@0.111.1, react@19.3.1, react-dom@19.3.1, react-markdown@10.1.0, rehype-katex@7.0.1, remark-gfm@4.0.1 (+20 more)

### Community 6 - "validateExam"
Cohesion: 0.14
Nodes (23): clone(), createCloudApi(), createCloudStorage(), decode(), read(), examResult(), examSummary(), invalid() (+15 more)

### Community 7 - "CloudGateway"
Cohesion: 0.24
Nodes (3): address_hash(), CloudGateway, email_address()

### Community 8 - "ForcedRecall.jsx"
Cohesion: 0.30
Nodes (10): ForcedRecall(), Preferences, RecallProvider(), clean(), fraction(), recallDelay(), recallPool(), recallQuestion() (+2 more)

### Community 9 - "services"
Cohesion: 0.14
Nodes (13): key, value, services, autoDeployTrigger, dockerContext, dockerfilePath, envVars, healthCheckPath (+5 more)

### Community 10 - "validate_workspace"
Cohesion: 0.56
Nodes (10): invalid(), validate_workspace(), array(), cards(), integer(), labels(), name(), obj() (+2 more)

### Community 11 - "202610160001_private_cloud_workspaces.sql"
Cohesion: 0.43
Nodes (4): public.studycade_save_workspace(), public.studycade_workspaces, studycade_private.cloud_allowlist, studycade_private.is_cloud_member()

## Knowledge Gaps
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api()` connect `main.jsx` to `ForcedRecall.jsx`, `guest.js`, `validateExam`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `create_guest_app()` (e.g. with `CloudConfig` and `lifespan()`) actually correct?**
  _`create_guest_app()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `content.py` be split into smaller, more focused modules?**
  _Cohesion score 0.0528169014084507 - nodes in this community are weakly interconnected._
- **Why does `react` connect `main.jsx` to `ForcedRecall.jsx`, `content.js`, `package.json`, `validateExam`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Should `main.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07769973661106233 - nodes in this community are weakly interconnected._
- **Why does `Games()` connect `content.js` to `main.jsx`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Should `content.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10917874396135266 - nodes in this community are weakly interconnected._
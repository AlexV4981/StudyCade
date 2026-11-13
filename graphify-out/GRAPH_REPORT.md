# Graph Report - StudyCade  (2026-11-13)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 509 nodes · 1206 edges · 16 communities (14 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `44bbc49f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- guest.py
- content.js
- content.py
- main.jsx
- generate-chemistry-assets.mjs
- api
- guest.js
- with
- package.json
- ForcedRecall.jsx
- chemistry-assets.yml
- CloudGateway
- services
- 202610160001_private_cloud_workspaces.sql
- overrides

## God Nodes (most connected - your core abstractions)
1. `api()` - 39 edges
2. `run()` - 30 edges
3. `create_guest_app()` - 24 edges
4. `App()` - 23 edges
5. `Content()` - 20 edges
6. `react` - 20 edges
7. `bad()` - 19 edges
8. `restore()` - 19 edges
9. `Games()` - 18 edges
10. `NotesReader()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `commit()` --calls--> `api()`  [EXTRACTED]
  frontend/src/Importer.jsx → frontend/src/api.js
- `upload()` --indirect_call--> `subject()`  [INFERRED]
  frontend/src/Importer.jsx → frontend/src/guest.js
- `NotesReader()` --indirect_call--> `hasSectionBody()`  [INFERRED]
  frontend/src/Notes.jsx → frontend/src/reading.js
- `start()` --calls--> `api()`  [EXTRACTED]
  frontend/src/Settings.jsx → frontend/src/api.js
- `create_guest_app()` --uses--> `CloudConfig`  [INFERRED]
  backend/guest.py → backend/cloud.py

## Import Cycles
- None detected.

## Communities (16 total, 2 thin omitted)

### Community 0 - "guest.py"
Cohesion: 0.05
Nodes (17): CloudConfig, invalid(), validate_workspace(), array(), cards(), integer(), labels(), name() (+9 more)

### Community 1 - "content.js"
Cohesion: 0.09
Nodes (43): callouts(), walk(), Content(), CONTENT_PAGE_SIZE, normalize(), RenderContent(), safeUrl(), Editor() (+35 more)

### Community 2 - "content.py"
Cohesion: 0.08
Nodes (19): callout_blocks(), _card(), _label_document(), preview_document(), preview_exam(), safe_source_name(), _suggest_cards(), update_exam() (+11 more)

### Community 3 - "main.jsx"
Cohesion: 0.10
Nodes (30): clearCloudCache(), getDeploymentConfig(), reloadCloudWorkspace(), request(), clearDeviceSessions(), downloadJson(), save(), stored() (+22 more)

### Community 4 - "generate-chemistry-assets.mjs"
Cohesion: 0.09
Nodes (39): CHEMISTRY_CATEGORIES, CHEMISTRY_ELEMENT_ASSETS, CHEMISTRY_LIBRARY, CHEMISTRY_STOCK_REFERENCES, CHEMISTRY_TOPICS, ELEMENT_NAMES, ELEMENTS, groups (+31 more)

### Community 5 - "api"
Cohesion: 0.11
Nodes (32): api(), examResult(), examSummary(), invalid(), keys(), text(), updateExam(), validateExam() (+24 more)

### Community 6 - "guest.js"
Cohesion: 0.18
Nodes (35): addProgress(), backupPayload(), bad(), boundedArray(), cardsFrom(), clone(), run(), createIndexedDBStorage() (+27 more)

### Community 7 - "with"
Cohesion: 0.06
Nodes (36): concurrency, cancel-in-progress, group, GRAPHIFY_NO_CTA, name, runs-on, steps, name (+28 more)

### Community 8 - "package.json"
Cohesion: 0.09
Nodes (28): dependencies, katex@0.19.0, mathlive@0.111.1, react@19.3.1, react-dom@19.3.1, react-markdown@10.1.0, rehype-katex@7.0.1, remark-gfm@4.0.1 (+20 more)

### Community 9 - "ForcedRecall.jsx"
Cohesion: 0.16
Nodes (15): clone(), createCloudApi(), createCloudStorage(), decode(), read(), ForcedRecall(), Preferences, RecallProvider() (+7 more)

### Community 10 - "chemistry-assets.yml"
Cohesion: 0.09
Nodes (22): concurrency, cancel-in-progress, group, runs-on, steps, jobs, generate, name (+14 more)

### Community 11 - "CloudGateway"
Cohesion: 0.24
Nodes (3): address_hash(), CloudGateway, email_address()

### Community 12 - "services"
Cohesion: 0.14
Nodes (13): key, value, services, autoDeployTrigger, dockerContext, dockerfilePath, envVars, healthCheckPath (+5 more)

### Community 13 - "202610160001_private_cloud_workspaces.sql"
Cohesion: 0.43
Nodes (4): public.studycade_save_workspace(), public.studycade_workspaces, studycade_private.cloud_allowlist, studycade_private.is_cloud_member()

## Knowledge Gaps
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api()` connect `api` to `content.js`, `main.jsx`, `guest.js`, `ForcedRecall.jsx`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `create_guest_app()` (e.g. with `CloudConfig` and `lifespan()`) actually correct?**
  _`create_guest_app()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `guest.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05384615384615385 - nodes in this community are weakly interconnected._
- **Why does `react` connect `content.js` to `package.json`, `ForcedRecall.jsx`, `main.jsx`, `generate-chemistry-assets.mjs`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Content()` (e.g. with `RenderContent()` and `image.test.js`) actually correct?**
  _`Content()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `content.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09176587301587301 - nodes in this community are weakly interconnected._
- **Why does `CHEMISTRY_TOPICS` connect `generate-chemistry-assets.mjs` to `main.jsx`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
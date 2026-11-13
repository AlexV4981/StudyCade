# Graph Report - StudyCade  (2026-11-13)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 474 nodes · 1134 edges · 18 communities (14 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `707a1413`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- main.jsx
- guest.js
- content.py
- content.js
- generate-chemistry-assets.mjs
- with
- package.json
- ForcedRecall.jsx
- Games
- CloudGateway
- create_guest_app
- services
- validate_workspace
- test_guest_smoke.py
- 202610160001_private_cloud_workspaces.sql
- overrides

## God Nodes (most connected - your core abstractions)
1. `api()` - 39 edges
2. `run()` - 30 edges
3. `App()` - 23 edges
4. `create_guest_app()` - 22 edges
5. `Content()` - 20 edges
6. `bad()` - 19 edges
7. `restore()` - 19 edges
8. `react` - 19 edges
9. `NotesReader()` - 18 edges
10. `Games()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `chooseDeck()` --calls--> `api()`  [EXTRACTED]
  frontend/src/ForcedRecall.jsx → frontend/src/api.js
- `refreshFiles()` --calls--> `api()`  [EXTRACTED]
  frontend/src/Notes.jsx → frontend/src/api.js
- `review()` --calls--> `api()`  [EXTRACTED]
  frontend/src/Notes.jsx → frontend/src/api.js
- `upload()` --indirect_call--> `subject()`  [INFERRED]
  frontend/src/Importer.jsx → frontend/src/guest.js
- `NotesReader()` --indirect_call--> `hasSectionBody()`  [INFERRED]
  frontend/src/Notes.jsx → frontend/src/reading.js

## Import Cycles
- None detected.

## Communities (18 total, 4 thin omitted)

### Community 0 - "main.jsx"
Cohesion: 0.08
Nodes (43): api(), clearCloudCache(), getDeploymentConfig(), reloadCloudWorkspace(), request(), clearDeviceSessions(), downloadJson(), save() (+35 more)

### Community 1 - "guest.js"
Cohesion: 0.13
Nodes (45): examResult(), examSummary(), invalid(), keys(), text(), updateExam(), validateExam(), addProgress() (+37 more)

### Community 2 - "content.py"
Cohesion: 0.08
Nodes (19): callout_blocks(), _card(), _label_document(), preview_document(), preview_exam(), safe_source_name(), _suggest_cards(), update_exam() (+11 more)

### Community 3 - "content.js"
Cohesion: 0.12
Nodes (32): callouts(), walk(), Content(), CONTENT_PAGE_SIZE, normalize(), RenderContent(), safeUrl(), GameTerm() (+24 more)

### Community 4 - "generate-chemistry-assets.mjs"
Cohesion: 0.10
Nodes (34): CHEMISTRY_CATEGORIES, CHEMISTRY_ELEMENT_ASSETS, CHEMISTRY_LIBRARY, CHEMISTRY_TOPICS, ELEMENT_NAMES, ELEMENTS, groups, TOPIC_ROWS (+26 more)

### Community 5 - "with"
Cohesion: 0.06
Nodes (36): concurrency, cancel-in-progress, group, GRAPHIFY_NO_CTA, name, runs-on, steps, name (+28 more)

### Community 6 - "package.json"
Cohesion: 0.09
Nodes (28): dependencies, katex@0.19.0, mathlive@0.111.1, react@19.3.1, react-dom@19.3.1, react-markdown@10.1.0, rehype-katex@7.0.1, remark-gfm@4.0.1 (+20 more)

### Community 7 - "ForcedRecall.jsx"
Cohesion: 0.15
Nodes (16): clone(), createCloudApi(), createCloudStorage(), decode(), read(), ForcedRecall(), chooseDeck(), Preferences (+8 more)

### Community 8 - "Games"
Cohesion: 0.17
Nodes (18): Editor(), eligiblePairs(), initial(), MODES, optionsFor(), parseRows(), quoteRows(), result() (+10 more)

### Community 10 - "CloudGateway"
Cohesion: 0.24
Nodes (3): address_hash(), CloudGateway, email_address()

### Community 11 - "create_guest_app"
Cohesion: 0.13
Nodes (5): CloudConfig, create_guest_app(), __call__(), guard(), security_headers()

### Community 12 - "services"
Cohesion: 0.14
Nodes (13): key, value, services, autoDeployTrigger, dockerContext, dockerfilePath, envVars, healthCheckPath (+5 more)

### Community 13 - "validate_workspace"
Cohesion: 0.56
Nodes (10): invalid(), validate_workspace(), array(), cards(), integer(), labels(), name(), obj() (+2 more)

### Community 15 - "202610160001_private_cloud_workspaces.sql"
Cohesion: 0.43
Nodes (4): public.studycade_save_workspace(), public.studycade_workspaces, studycade_private.cloud_allowlist, studycade_private.is_cloud_member()

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api()` connect `main.jsx` to `Games`, `guest.js`, `content.js`, `ForcedRecall.jsx`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `create_guest_app()` (e.g. with `CloudConfig` and `lifespan()`) actually correct?**
  _`create_guest_app()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `main.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08038075092543628 - nodes in this community are weakly interconnected._
- **Why does `react` connect `content.js` to `Games`, `main.jsx`, `package.json`, `ForcedRecall.jsx`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Content()` (e.g. with `RenderContent()` and `image.test.js`) actually correct?**
  _`Content()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `guest.js` be split into smaller, more focused modules?**
  _Cohesion score 0.12862745098039216 - nodes in this community are weakly interconnected._
- **Why does `create_guest_app()` connect `create_guest_app` to `guest.py`, `CloudGateway`, `test_guest_smoke.py`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
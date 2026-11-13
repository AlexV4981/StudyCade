# Graph Report - StudyCade  (2026-11-13)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 425 nodes · 1023 edges · 15 communities (13 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1d88a070`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- main.jsx
- content.js
- guest.py
- guest.js
- with
- package.json
- content.py
- ForcedRecall.jsx
- CloudGateway
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
10. `react` - 18 edges

## Surprising Connections (you probably didn't know these)
- `chooseDeck()` --calls--> `api()`  [EXTRACTED]
  frontend/src/ForcedRecall.jsx → frontend/src/api.js
- `upload()` --indirect_call--> `subject()`  [INFERRED]
  frontend/src/Importer.jsx → frontend/src/guest.js
- `create_guest_app()` --uses--> `CloudConfig`  [INFERRED]
  backend/guest.py → backend/cloud.py
- `create_guest_app()` --calls--> `CloudGateway`  [EXTRACTED]
  backend/guest.py → backend/cloud.py
- `Editor()` --calls--> `api()`  [EXTRACTED]
  frontend/src/Editor.jsx → frontend/src/api.js

## Import Cycles
- None detected.

## Communities (15 total, 2 thin omitted)

### Community 0 - "main.jsx"
Cohesion: 0.07
Nodes (51): api(), clearCloudCache(), getDeploymentConfig(), reloadCloudWorkspace(), request(), clearDeviceSessions(), downloadJson(), save() (+43 more)

### Community 1 - "content.js"
Cohesion: 0.09
Nodes (42): callouts(), walk(), Content(), CONTENT_PAGE_SIZE, normalize(), RenderContent(), safeUrl(), Editor() (+34 more)

### Community 2 - "guest.py"
Cohesion: 0.06
Nodes (6): CloudConfig, create_guest_app(), __call__(), guard(), security_headers(), GuestSmokeTests

### Community 3 - "guest.js"
Cohesion: 0.13
Nodes (45): examResult(), examSummary(), invalid(), keys(), text(), updateExam(), validateExam(), addProgress() (+37 more)

### Community 4 - "with"
Cohesion: 0.06
Nodes (36): concurrency, cancel-in-progress, group, GRAPHIFY_NO_CTA, name, runs-on, steps, name (+28 more)

### Community 5 - "package.json"
Cohesion: 0.09
Nodes (28): dependencies, katex@0.19.0, mathlive@0.111.1, react@19.3.1, react-dom@19.3.1, react-markdown@10.1.0, rehype-katex@7.0.1, remark-gfm@4.0.1 (+20 more)

### Community 6 - "content.py"
Cohesion: 0.17
Nodes (14): callout_blocks(), _card(), _label_document(), preview_document(), preview_exam(), safe_source_name(), _suggest_cards(), update_exam() (+6 more)

### Community 7 - "ForcedRecall.jsx"
Cohesion: 0.15
Nodes (16): clone(), createCloudApi(), createCloudStorage(), decode(), read(), ForcedRecall(), chooseDeck(), Preferences (+8 more)

### Community 8 - "CloudGateway"
Cohesion: 0.24
Nodes (3): address_hash(), CloudGateway, email_address()

### Community 9 - "check_public_tree.py"
Cohesion: 0.22
Nodes (4): allowed_example_email(), inspect(), main(), PublicTreeCheckTests

### Community 10 - "services"
Cohesion: 0.14
Nodes (13): key, value, services, autoDeployTrigger, dockerContext, dockerfilePath, envVars, healthCheckPath (+5 more)

### Community 11 - "validate_workspace"
Cohesion: 0.56
Nodes (10): invalid(), validate_workspace(), array(), cards(), integer(), labels(), name(), obj() (+2 more)

### Community 12 - "202610160001_private_cloud_workspaces.sql"
Cohesion: 0.43
Nodes (4): public.studycade_save_workspace(), public.studycade_workspaces, studycade_private.cloud_allowlist, studycade_private.is_cloud_member()

## Knowledge Gaps
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api()` connect `main.jsx` to `content.js`, `guest.js`, `ForcedRecall.jsx`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `create_guest_app()` (e.g. with `CloudConfig` and `lifespan()`) actually correct?**
  _`create_guest_app()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `main.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07039337474120083 - nodes in this community are weakly interconnected._
- **Why does `react` connect `content.js` to `main.jsx`, `package.json`, `ForcedRecall.jsx`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Should `content.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09062980030721966 - nodes in this community are weakly interconnected._
- **Why does `create_guest_app()` connect `guest.py` to `CloudGateway`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `guest.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05580693815987934 - nodes in this community are weakly interconnected._
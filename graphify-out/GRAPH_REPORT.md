# Graph Report - StudyCade  (2026-11-13)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 434 nodes · 1055 edges · 19 communities (15 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6ef0d92e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- main.jsx
- content.js
- guest.js
- with
- validateExam
- package.json
- content.py
- create_guest_app
- CloudGateway
- check_public_tree.py
- ForcedRecall.jsx
- services
- security_headers
- validate_workspace
- 202610160001_private_cloud_workspaces.sql
- validate_exam
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
- `deleteExam()` --calls--> `api()`  [EXTRACTED]
  frontend/src/Exams.jsx → frontend/src/api.js
- `chooseDeck()` --calls--> `api()`  [EXTRACTED]
  frontend/src/ForcedRecall.jsx → frontend/src/api.js
- `upload()` --indirect_call--> `subject()`  [INFERRED]
  frontend/src/Importer.jsx → frontend/src/guest.js
- `create_guest_app()` --uses--> `CloudConfig`  [INFERRED]
  backend/guest.py → backend/cloud.py
- `create_guest_app()` --calls--> `CloudGateway`  [EXTRACTED]
  backend/guest.py → backend/cloud.py

## Import Cycles
- None detected.

## Communities (19 total, 4 thin omitted)

### Community 0 - "main.jsx"
Cohesion: 0.07
Nodes (52): api(), clearCloudCache(), getDeploymentConfig(), reloadCloudWorkspace(), request(), clearDeviceSessions(), downloadJson(), save() (+44 more)

### Community 1 - "content.js"
Cohesion: 0.11
Nodes (33): callouts(), walk(), Content(), CONTENT_PAGE_SIZE, normalize(), RenderContent(), safeUrl(), eligiblePairs() (+25 more)

### Community 2 - "guest.js"
Cohesion: 0.18
Nodes (35): addProgress(), backupPayload(), bad(), boundedArray(), cardsFrom(), clone(), run(), createIndexedDBStorage() (+27 more)

### Community 3 - "with"
Cohesion: 0.06
Nodes (36): concurrency, cancel-in-progress, group, GRAPHIFY_NO_CTA, name, runs-on, steps, name (+28 more)

### Community 4 - "validateExam"
Cohesion: 0.11
Nodes (23): clone(), createCloudApi(), createCloudStorage(), decode(), read(), examResult(), examSummary(), invalid() (+15 more)

### Community 5 - "package.json"
Cohesion: 0.09
Nodes (28): dependencies, katex@0.19.0, mathlive@0.111.1, react@19.3.1, react-dom@19.3.1, react-markdown@10.1.0, rehype-katex@7.0.1, remark-gfm@4.0.1 (+20 more)

### Community 7 - "content.py"
Cohesion: 0.21
Nodes (12): callout_blocks(), _card(), _label_document(), preview_document(), preview_exam(), safe_source_name(), _suggest_cards(), combine_subjects() (+4 more)

### Community 8 - "create_guest_app"
Cohesion: 0.10
Nodes (3): CloudConfig, create_guest_app(), GuestSmokeTests

### Community 9 - "CloudGateway"
Cohesion: 0.24
Nodes (3): address_hash(), CloudGateway, email_address()

### Community 10 - "check_public_tree.py"
Cohesion: 0.22
Nodes (4): allowed_example_email(), inspect(), main(), PublicTreeCheckTests

### Community 11 - "ForcedRecall.jsx"
Cohesion: 0.33
Nodes (11): ForcedRecall(), chooseDeck(), Preferences, RecallProvider(), clean(), fraction(), recallDelay(), recallPool() (+3 more)

### Community 12 - "services"
Cohesion: 0.14
Nodes (13): key, value, services, autoDeployTrigger, dockerContext, dockerfilePath, envVars, healthCheckPath (+5 more)

### Community 13 - "security_headers"
Cohesion: 0.20
Nodes (4): __call__(), guard(), security_headers(), MarkdownImageTests

### Community 14 - "validate_workspace"
Cohesion: 0.56
Nodes (10): invalid(), validate_workspace(), array(), cards(), integer(), labels(), name(), obj() (+2 more)

### Community 15 - "202610160001_private_cloud_workspaces.sql"
Cohesion: 0.43
Nodes (4): public.studycade_save_workspace(), public.studycade_workspaces, studycade_private.cloud_allowlist, studycade_private.is_cloud_member()

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api()` connect `main.jsx` to `guest.js`, `ForcedRecall.jsx`, `validateExam`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `create_guest_app()` (e.g. with `CloudConfig` and `lifespan()`) actually correct?**
  _`create_guest_app()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `main.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07228070175438596 - nodes in this community are weakly interconnected._
- **Why does `react` connect `main.jsx` to `content.js`, `ForcedRecall.jsx`, `validateExam`, `package.json`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Content()` (e.g. with `RenderContent()` and `image.test.js`) actually correct?**
  _`Content()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `content.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10799319727891156 - nodes in this community are weakly interconnected._
- **Why does `create_guest_app()` connect `create_guest_app` to `CloudGateway`, `security_headers`, `guest.py`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
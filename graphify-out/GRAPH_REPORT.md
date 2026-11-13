# Graph Report - StudyCade  (2026-11-13)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 421 nodes · 1011 edges · 19 communities (15 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `69c75fb7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- content.js
- main.jsx
- guest.js
- with
- package.json
- NotesReader
- validateExam
- create_guest_app
- CloudGateway
- content.py
- check_public_tree.py
- services
- validate_workspace
- subjects.py
- test_guest_smoke.py
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
8. `Games()` - 18 edges
9. `NotesReader()` - 18 edges
10. `CloudGateway` - 17 edges

## Surprising Connections (you probably didn't know these)
- `deleteExam()` --calls--> `api()`  [EXTRACTED]
  frontend/src/Exams.jsx → frontend/src/api.js
- `chooseDeck()` --calls--> `api()`  [EXTRACTED]
  frontend/src/ForcedRecall.jsx → frontend/src/api.js
- `refreshFiles()` --calls--> `api()`  [EXTRACTED]
  frontend/src/Notes.jsx → frontend/src/api.js
- `review()` --calls--> `api()`  [EXTRACTED]
  frontend/src/Notes.jsx → frontend/src/api.js
- `upload()` --indirect_call--> `subject()`  [INFERRED]
  frontend/src/Importer.jsx → frontend/src/guest.js

## Import Cycles
- None detected.

## Communities (19 total, 4 thin omitted)

### Community 0 - "content.js"
Cohesion: 0.10
Nodes (38): callouts(), walk(), Content(), CONTENT_PAGE_SIZE, normalize(), RenderContent(), safeUrl(), Editor() (+30 more)

### Community 1 - "main.jsx"
Cohesion: 0.10
Nodes (34): api(), clearCloudCache(), getDeploymentConfig(), reloadCloudWorkspace(), request(), clearDeviceSessions(), downloadJson(), save() (+26 more)

### Community 2 - "guest.js"
Cohesion: 0.13
Nodes (43): clone(), createCloudApi(), createCloudStorage(), decode(), read(), addProgress(), backupPayload(), bad() (+35 more)

### Community 3 - "with"
Cohesion: 0.06
Nodes (36): concurrency, cancel-in-progress, group, GRAPHIFY_NO_CTA, name, runs-on, steps, name (+28 more)

### Community 4 - "package.json"
Cohesion: 0.09
Nodes (28): dependencies, katex@0.19.0, mathlive@0.111.1, react@19.3.1, react-dom@19.3.1, react-markdown@10.1.0, rehype-katex@7.0.1, remark-gfm@4.0.1 (+20 more)

### Community 5 - "NotesReader"
Cohesion: 0.14
Nodes (22): ForcedRecall(), chooseDeck(), Preferences, RecallProvider(), fileKey(), filePath(), Notes(), NotesReader() (+14 more)

### Community 7 - "validateExam"
Cohesion: 0.21
Nodes (15): examResult(), examSummary(), invalid(), keys(), text(), updateExam(), validateExam(), EXAM_PROMPT (+7 more)

### Community 8 - "create_guest_app"
Cohesion: 0.12
Nodes (5): CloudConfig, create_guest_app(), __call__(), guard(), security_headers()

### Community 9 - "CloudGateway"
Cohesion: 0.24
Nodes (3): address_hash(), CloudGateway, email_address()

### Community 10 - "content.py"
Cohesion: 0.22
Nodes (8): callout_blocks(), _card(), preview_document(), preview_exam(), safe_source_name(), _suggest_cards(), update_exam(), validate_exam()

### Community 11 - "check_public_tree.py"
Cohesion: 0.22
Nodes (4): allowed_example_email(), inspect(), main(), PublicTreeCheckTests

### Community 12 - "services"
Cohesion: 0.14
Nodes (13): key, value, services, autoDeployTrigger, dockerContext, dockerfilePath, envVars, healthCheckPath (+5 more)

### Community 13 - "validate_workspace"
Cohesion: 0.56
Nodes (10): invalid(), validate_workspace(), array(), cards(), integer(), labels(), name(), obj() (+2 more)

### Community 14 - "subjects.py"
Cohesion: 0.42
Nodes (6): _label_document(), combine_subjects(), detect_subject(), detect_subjects(), explicit_subjects(), label_subjects()

### Community 16 - "202610160001_private_cloud_workspaces.sql"
Cohesion: 0.43
Nodes (4): public.studycade_save_workspace(), public.studycade_workspaces, studycade_private.cloud_allowlist, studycade_private.is_cloud_member()

## Knowledge Gaps
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api()` connect `main.jsx` to `content.js`, `guest.js`, `NotesReader`, `validateExam`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `create_guest_app()` (e.g. with `CloudConfig` and `lifespan()`) actually correct?**
  _`create_guest_app()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `content.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10025062656641603 - nodes in this community are weakly interconnected._
- **Why does `react` connect `content.js` to `main.jsx`, `package.json`, `NotesReader`, `validateExam`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Should `main.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09503843466107617 - nodes in this community are weakly interconnected._
- **Why does `create_guest_app()` connect `create_guest_app` to `CloudGateway`, `guest.py`, `test_guest_smoke.py`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Should `guest.js` be split into smaller, more focused modules?**
  _Cohesion score 0.1322849213691027 - nodes in this community are weakly interconnected._
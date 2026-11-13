# Graph Report - StudyCade  (2026-11-13)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 444 nodes · 1064 edges · 17 communities (15 shown, 2 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ec899f94`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- content.js
- guest.py
- main.jsx
- guest.js
- with
- content.py
- package.json
- api
- CloudGateway
- check_public_tree.py
- ForcedRecall.jsx
- services
- chemistry-library.js
- cloud.js
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
9. `Games()` - 18 edges
10. `NotesReader()` - 18 edges

## Surprising Connections (you probably didn't know these)
- `chooseDeck()` --calls--> `api()`  [EXTRACTED]
  frontend/src/ForcedRecall.jsx → frontend/src/api.js
- `loadDeck()` --calls--> `api()`  [EXTRACTED]
  frontend/src/main.jsx → frontend/src/api.js
- `saveCardStatus()` --calls--> `api()`  [EXTRACTED]
  frontend/src/main.jsx → frontend/src/api.js
- `NotesReader()` --indirect_call--> `hasSectionBody()`  [INFERRED]
  frontend/src/Notes.jsx → frontend/src/reading.js
- `upload()` --indirect_call--> `subject()`  [INFERRED]
  frontend/src/Importer.jsx → frontend/src/guest.js

## Import Cycles
- None detected.

## Communities (17 total, 2 thin omitted)

### Community 0 - "content.js"
Cohesion: 0.09
Nodes (41): callouts(), walk(), Content(), CONTENT_PAGE_SIZE, normalize(), RenderContent(), safeUrl(), Editor() (+33 more)

### Community 1 - "guest.py"
Cohesion: 0.05
Nodes (16): CloudConfig, invalid(), validate_workspace(), array(), cards(), integer(), labels(), name() (+8 more)

### Community 2 - "main.jsx"
Cohesion: 0.09
Nodes (31): clearCloudCache(), getDeploymentConfig(), reloadCloudWorkspace(), request(), clearDeviceSessions(), downloadJson(), save(), stored() (+23 more)

### Community 3 - "guest.js"
Cohesion: 0.13
Nodes (45): examResult(), examSummary(), invalid(), keys(), text(), updateExam(), validateExam(), addProgress() (+37 more)

### Community 4 - "with"
Cohesion: 0.06
Nodes (36): concurrency, cancel-in-progress, group, GRAPHIFY_NO_CTA, name, runs-on, steps, name (+28 more)

### Community 5 - "content.py"
Cohesion: 0.13
Nodes (15): callout_blocks(), _card(), _label_document(), preview_document(), preview_exam(), safe_source_name(), _suggest_cards(), update_exam() (+7 more)

### Community 6 - "package.json"
Cohesion: 0.09
Nodes (28): dependencies, katex@0.19.0, mathlive@0.111.1, react@19.3.1, react-dom@19.3.1, react-markdown@10.1.0, rehype-katex@7.0.1, remark-gfm@4.0.1 (+20 more)

### Community 7 - "api"
Cohesion: 0.15
Nodes (21): api(), Exams(), deleteExam(), importExam(), load(), parse(), save(), commit() (+13 more)

### Community 8 - "CloudGateway"
Cohesion: 0.24
Nodes (3): address_hash(), CloudGateway, email_address()

### Community 9 - "check_public_tree.py"
Cohesion: 0.22
Nodes (4): allowed_example_email(), inspect(), main(), PublicTreeCheckTests

### Community 10 - "ForcedRecall.jsx"
Cohesion: 0.33
Nodes (11): ForcedRecall(), chooseDeck(), Preferences, RecallProvider(), clean(), fraction(), recallDelay(), recallPool() (+3 more)

### Community 11 - "services"
Cohesion: 0.14
Nodes (13): key, value, services, autoDeployTrigger, dockerContext, dockerfilePath, envVars, healthCheckPath (+5 more)

### Community 12 - "chemistry-library.js"
Cohesion: 0.20
Nodes (8): CHEMISTRY_CATEGORIES, CHEMISTRY_ELEMENT_ASSETS, CHEMISTRY_LIBRARY, CHEMISTRY_TOPICS, ELEMENT_NAMES, ELEMENTS, groups, TOPIC_ROWS

### Community 13 - "cloud.js"
Cohesion: 0.46
Nodes (5): clone(), createCloudApi(), createCloudStorage(), decode(), read()

### Community 14 - "202610160001_private_cloud_workspaces.sql"
Cohesion: 0.43
Nodes (4): public.studycade_save_workspace(), public.studycade_workspaces, studycade_private.cloud_allowlist, studycade_private.is_cloud_member()

## Knowledge Gaps
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api()` connect `api` to `content.js`, `ForcedRecall.jsx`, `main.jsx`, `guest.js`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `create_guest_app()` (e.g. with `CloudConfig` and `lifespan()`) actually correct?**
  _`create_guest_app()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `content.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09421402969790067 - nodes in this community are weakly interconnected._
- **Why does `react` connect `content.js` to `ForcedRecall.jsx`, `main.jsx`, `package.json`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Content()` (e.g. with `RenderContent()` and `image.test.js`) actually correct?**
  _`Content()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `guest.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05446853516657853 - nodes in this community are weakly interconnected._
- **Why does `create_guest_app()` connect `guest.py` to `CloudGateway`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
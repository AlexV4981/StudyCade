# Graph Report - StudyCade  (2026-11-13)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 393 nodes · 958 edges · 16 communities (14 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `447aebef`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- content.py
- content.js
- main.jsx
- guest.js
- with
- package.json
- Notes.jsx
- CloudGateway
- ForcedRecall.jsx
- services
- NotesReader
- validate_workspace
- 202610160001_private_cloud_workspaces.sql
- cloud.js
- overrides

## God Nodes (most connected - your core abstractions)
1. `api()` - 39 edges
2. `run()` - 30 edges
3. `App()` - 23 edges
4. `create_guest_app()` - 20 edges
5. `Content()` - 19 edges
6. `bad()` - 19 edges
7. `restore()` - 19 edges
8. `Games()` - 18 edges
9. `NotesReader()` - 18 edges
10. `CloudGateway` - 17 edges

## Surprising Connections (you probably didn't know these)
- `commit()` --calls--> `api()`  [EXTRACTED]
  frontend/src/Importer.jsx → frontend/src/api.js
- `upload()` --indirect_call--> `subject()`  [INFERRED]
  frontend/src/Importer.jsx → frontend/src/guest.js
- `NotesReader()` --indirect_call--> `hasSectionBody()`  [INFERRED]
  frontend/src/Notes.jsx → frontend/src/reading.js
- `refreshFiles()` --calls--> `api()`  [EXTRACTED]
  frontend/src/Notes.jsx → frontend/src/api.js
- `review()` --calls--> `api()`  [EXTRACTED]
  frontend/src/Notes.jsx → frontend/src/api.js

## Import Cycles
- None detected.

## Communities (16 total, 2 thin omitted)

### Community 0 - "content.py"
Cohesion: 0.05
Nodes (19): CloudConfig, callout_blocks(), _card(), _label_document(), preview_document(), preview_exam(), safe_source_name(), _suggest_cards() (+11 more)

### Community 1 - "content.js"
Cohesion: 0.10
Nodes (38): callouts(), walk(), Content(), CONTENT_PAGE_SIZE, normalize(), RenderContent(), safeUrl(), Editor() (+30 more)

### Community 2 - "main.jsx"
Cohesion: 0.11
Nodes (32): api(), clearCloudCache(), getDeploymentConfig(), reloadCloudWorkspace(), request(), clearDeviceSessions(), downloadJson(), save() (+24 more)

### Community 3 - "guest.js"
Cohesion: 0.18
Nodes (35): addProgress(), backupPayload(), bad(), boundedArray(), cardsFrom(), clone(), run(), createIndexedDBStorage() (+27 more)

### Community 4 - "with"
Cohesion: 0.06
Nodes (35): concurrency, cancel-in-progress, group, GRAPHIFY_NO_CTA, name, runs-on, steps, name (+27 more)

### Community 5 - "package.json"
Cohesion: 0.09
Nodes (28): dependencies, katex@0.19.0, mathlive@0.111.1, react@19.3.1, react-dom@19.3.1, react-markdown@10.1.0, rehype-katex@7.0.1, remark-gfm@4.0.1 (+20 more)

### Community 6 - "Notes.jsx"
Cohesion: 0.16
Nodes (21): examResult(), examSummary(), invalid(), keys(), text(), updateExam(), validateExam(), EXAM_PROMPT (+13 more)

### Community 7 - "CloudGateway"
Cohesion: 0.24
Nodes (3): address_hash(), CloudGateway, email_address()

### Community 8 - "ForcedRecall.jsx"
Cohesion: 0.33
Nodes (11): ForcedRecall(), chooseDeck(), Preferences, RecallProvider(), clean(), fraction(), recallDelay(), recallPool() (+3 more)

### Community 9 - "services"
Cohesion: 0.14
Nodes (13): key, value, services, autoDeployTrigger, dockerContext, dockerfilePath, envVars, healthCheckPath (+5 more)

### Community 10 - "NotesReader"
Cohesion: 0.26
Nodes (10): fileKey(), filePath(), NotesReader(), deleteSelected(), refreshRemaining(), openFile(), openSequence(), refreshFiles() (+2 more)

### Community 11 - "validate_workspace"
Cohesion: 0.56
Nodes (10): invalid(), validate_workspace(), array(), cards(), integer(), labels(), name(), obj() (+2 more)

### Community 12 - "202610160001_private_cloud_workspaces.sql"
Cohesion: 0.43
Nodes (4): public.studycade_save_workspace(), public.studycade_workspaces, studycade_private.cloud_allowlist, studycade_private.is_cloud_member()

### Community 13 - "cloud.js"
Cohesion: 0.60
Nodes (5): clone(), createCloudApi(), createCloudStorage(), decode(), read()

## Knowledge Gaps
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `api()` connect `main.jsx` to `content.js`, `guest.js`, `Notes.jsx`, `ForcedRecall.jsx`, `NotesReader`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `create_guest_app()` (e.g. with `CloudConfig` and `lifespan()`) actually correct?**
  _`create_guest_app()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `content.py` be split into smaller, more focused modules?**
  _Cohesion score 0.0528169014084507 - nodes in this community are weakly interconnected._
- **Why does `react` connect `content.js` to `ForcedRecall.jsx`, `main.jsx`, `package.json`, `Notes.jsx`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Should `content.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09643605870020965 - nodes in this community are weakly interconnected._
- **Why does `Games()` connect `content.js` to `main.jsx`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Should `main.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10638297872340426 - nodes in this community are weakly interconnected._
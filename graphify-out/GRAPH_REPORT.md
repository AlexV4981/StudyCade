# Graph Report - StudyCade  (2026-11-13)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 390 nodes · 932 edges · 15 communities (13 shown, 2 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2f041265`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- content.py
- main.jsx
- content.js
- guest.js
- with
- package.json
- Games.jsx
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

## Communities (15 total, 2 thin omitted)

### Community 0 - "content.py"
Cohesion: 0.05
Nodes (19): CloudConfig, callout_blocks(), _card(), _label_document(), preview_document(), preview_exam(), safe_source_name(), _suggest_cards() (+11 more)

### Community 1 - "main.jsx"
Cohesion: 0.09
Nodes (39): api(), clearCloudCache(), getDeploymentConfig(), reloadCloudWorkspace(), request(), deleteExam(), importExam(), load() (+31 more)

### Community 2 - "content.js"
Cohesion: 0.10
Nodes (34): callouts(), walk(), Content(), CONTENT_PAGE_SIZE, normalize(), RenderContent(), safeUrl(), EXAM_PROMPT (+26 more)

### Community 3 - "guest.js"
Cohesion: 0.18
Nodes (35): addProgress(), backupPayload(), bad(), boundedArray(), cardsFrom(), clone(), run(), createIndexedDBStorage() (+27 more)

### Community 4 - "with"
Cohesion: 0.06
Nodes (35): concurrency, cancel-in-progress, group, GRAPHIFY_NO_CTA, name, runs-on, steps, name (+27 more)

### Community 5 - "package.json"
Cohesion: 0.09
Nodes (28): dependencies, katex@0.19.0, mathlive@0.111.1, react@19.3.1, react-dom@19.3.1, react-markdown@10.1.0, rehype-katex@7.0.1, remark-gfm@4.0.1 (+20 more)

### Community 6 - "Games.jsx"
Cohesion: 0.21
Nodes (16): eligiblePairs(), initial(), MODES, optionsFor(), parseRows(), quoteRows(), result(), resumeRound() (+8 more)

### Community 7 - "validateExam"
Cohesion: 0.19
Nodes (17): clone(), createCloudApi(), createCloudStorage(), decode(), read(), examResult(), examSummary(), invalid() (+9 more)

### Community 8 - "CloudGateway"
Cohesion: 0.24
Nodes (3): address_hash(), CloudGateway, email_address()

### Community 9 - "ForcedRecall.jsx"
Cohesion: 0.33
Nodes (11): ForcedRecall(), chooseDeck(), Preferences, RecallProvider(), clean(), fraction(), recallDelay(), recallPool() (+3 more)

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

- **Why does `api()` connect `main.jsx` to `ForcedRecall.jsx`, `content.js`, `guest.js`, `validateExam`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `create_guest_app()` (e.g. with `CloudConfig` and `lifespan()`) actually correct?**
  _`create_guest_app()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Should `content.py` be split into smaller, more focused modules?**
  _Cohesion score 0.0528169014084507 - nodes in this community are weakly interconnected._
- **Why does `react` connect `content.js` to `ForcedRecall.jsx`, `package.json`, `Games.jsx`, `main.jsx`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Should `main.jsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0859538784067086 - nodes in this community are weakly interconnected._
- **Why does `Games()` connect `Games.jsx` to `main.jsx`, `content.js`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Should `content.js` be split into smaller, more focused modules?**
  _Cohesion score 0.10283687943262411 - nodes in this community are weakly interconnected._
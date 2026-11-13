# Development and verification

This is the current **React/Vite + FastAPI** version of StudyCade, not the older self-hosted Node/SQLite version visible in previous Git history.

## Build and run

From the repository root:

~~~bash
docker build -f Dockerfile.render -t studycade .
docker run --rm -p 10000:10000 studycade
~~~

Open **http://localhost:10000**. With cloud environment settings absent, this is a guest-only instance.

For frontend-only iteration, use Node 24 and pnpm 11.25.0:

~~~bash
cd frontend
pnpm install --frozen-lockfile
pnpm dev
~~~

The Vite dev server is not a substitute for FastAPI endpoints. Build and check the full Docker image before a release.

## Verification checklist

- Load **/healthz** and **/api/deployment**; verify guest mode and functional static assets.
- Import disposable Markdown and CSV text; check valid preview and malformed input.
- Create a note/deck, update progress, reload, and confirm guest IndexedDB persistence.
- Exercise paper study, timed recall and a disposable multiple-choice practice exam.
- Export a backup and verify it downloads.
- Confirm admin and local account-storage HTTP routes remain unavailable to public guest requests.
- With a separately approved HTTPS **test** setup, verify cloud login/logout, ownership isolation, reload, and save-version conflicts.

These are **manual release checks**, not claims of tests performed by this documentation update. The optimization branch includes Node tests under `frontend/src/*.test.js` and a public-file scanner under `scripts/`. Run all local gates before requesting review:

~~~bash
cd frontend
corepack pnpm install --frozen-lockfile
corepack pnpm test
corepack pnpm build
cd ..
python3 scripts/check_public_tree.py
python3 -m unittest discover -s scripts -p 'test_*.py'
~~~

These gates do not replace browser acceptance tests, backend deployment verification, or a review of earlier Git history.

## Implementation map

[FastAPI routes](../backend/guest.py) · [Import parser](../backend/content.py) · [Cloud gateway](../backend/cloud.py) · [Cloud validator](../backend/cloud_state.py) · [Practice modes](../frontend/src/Games.jsx) · [Notes](../frontend/src/Notes.jsx) · [Exams](../frontend/src/Exams.jsx) · [Guest storage](../frontend/src/guest.js) · [Cloud storage](../frontend/src/cloud.js) · [Importer](../frontend/src/Importer.jsx) · [Editor](../frontend/src/Editor.jsx) · [Settings](../frontend/src/Settings.jsx) · [New features](FEATURE_DEVELOPMENT.md).

Avoid committing passwords, API keys, private user data, study exports, sessions and database files. See [Security](../SECURITY.md).
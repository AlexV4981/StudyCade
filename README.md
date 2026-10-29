# StudyCade

A browser-based study workspace for turning Markdown and CSV study material into notes, review decks, paper practice, recall sessions and self-checks. Built with **React/Vite**, **FastAPI on Render**, and optional **Supabase** login and private workspace persistence.

[Open the app](https://studycade-guest.onrender.com) · [Topology and architecture](docs/ARCHITECTURE.md) · [Development](docs/DEVELOPMENT.md) · [Deployment](docs/DEPLOYMENT.md) · [Security](SECURITY.md)

## Features

- Import study material and organize source notes and practice decks.
- Work through questions on paper, then reveal hints, answers and explanations.
- Review with flashcards, matching and answer-selection modes, plus optional timed recall while reading.
- Import multiple-choice practice exams, track progress and review missed/unanswered questions.
- Use a browser-local guest workspace or an approved account with Supabase-backed cross-device saving.
- Export backups. Guest work is **not** silently uploaded when signing in.

StudyCade does **not** contact an AI provider to generate content: its prompt tools prepare text for a separate AI service. Imported material should be checked for correctness.

## Implementation

| Area | Responsibility | Source |
| --- | --- | --- |
| Frontend | React study interface and practice flows | [App](frontend/src/main.jsx) · [Notes](frontend/src/Notes.jsx) · [Exams](frontend/src/Exams.jsx) · [Games](frontend/src/Games.jsx) |
| Guest workspace | Browser IndexedDB persistence | [Guest adapter](frontend/src/guest.js) |
| Cloud client | Session-aware storage and version checks | [Cloud adapter](frontend/src/cloud.js) · [API dispatch](frontend/src/api.js) |
| API | FastAPI static delivery, bounded import preview | [Server](backend/guest.py) · [Parser](backend/content.py) |
| Cloud gateway | PKCE sign-in, encrypted HttpOnly cookies, access validation | [Gateway](backend/cloud.py) · [Validation](backend/cloud_state.py) |
| Data layer | Supabase Auth, owner-scoped workspace, RLS and version-aware writes | [SQL migration](supabase/migrations/202610160001_private_cloud_workspaces.sql) |
| Hosting | Multi-stage Docker/Vite build and non-root Python runtime | [Dockerfile](Dockerfile.render) · [Render blueprint](render.yaml) |

## Repository structure

~~~text
StudyCade/
├── backend/              FastAPI routes, parsing, cloud sessions and validation
├── frontend/
│   ├── src/              React components and browser storage adapters
│   └── public/           Public assets and associated licenses
├── supabase/migrations/  PostgreSQL schema and authorization logic
├── docs/                 Architecture, development, deployment, security design
├── Dockerfile.render
├── render.yaml
└── requirements-guest.lock
~~~

## Run a guest instance

~~~bash
docker build -f Dockerfile.render -t studycade .
docker run --rm -p 10000:10000 studycade
~~~

Open **http://localhost:10000**. This runs guest mode only; cloud authentication needs a separate approved HTTPS deployment and private environment settings. See [Development](docs/DEVELOPMENT.md) for review and verification.

## Data boundaries and releases

Guest content and progress are stored in browser IndexedDB. The import **Preview** feature temporarily sends selected source text to FastAPI for parsing, but does not save it as a server-side guest account. Approved signed-in users can save an owner-scoped workspace to Supabase through the Render gateway. See the [data-flow diagram](docs/ARCHITECTURE.md).

Render currently deploys from the **render-guest-security** branch, with automatic deployments disabled. This **main** branch is the organized public source; pushing here does **not** update the live application. [Release instructions](docs/DEPLOYMENT.md).

The repository should not contain live credentials, private email approvals, personal coursework, database exports or user backups. [Security and privacy](SECURITY.md). Source code and design notes are not an external security audit.
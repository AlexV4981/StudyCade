# Architecture and topology

StudyCade has two distinct persistence paths: an entirely **browser-local guest workspace**, and an **approved cloud workspace** backed by Supabase. Render serves the frontend and the narrowly scoped Python gateway.

## Deployment topology

~~~mermaid
flowchart LR
    subgraph Browser["User browser"]
      UI["React study interface"]
      GA["Guest adapter"]
      IDB[("IndexedDB guest workspace")]
      CA["Cloud adapter / in-memory state"]
      UI --> GA
      GA <--> IDB
      UI --> CA
    end
    subgraph Render["Render Docker service"]
      WEB["Compiled Vite assets"]
      API["FastAPI router"]
      PARSE["Markdown / CSV import parser"]
      GW["PKCE + session + workspace gateway"]
      VALID["Workspace validator"]
      API --> WEB
      API --> PARSE
      API --> GW
      GW --> VALID
    end
    subgraph Supabase["Supabase project (optional)"]
      AUTH["Supabase Auth / email link"]
      REST["PostgREST + authorized RPC"]
      DB[("PostgreSQL per-user workspace")]
      POLICY["RLS + private approval helper"]
      AUTH --> REST
      REST --> DB
      POLICY --> DB
    end
    UI -->|"HTTPS page / assets"| WEB
    UI -->|"HTTPS selected preview text"| PARSE
    CA -->|"Same-origin session / state"| GW
    GW -->|"PKCE authentication"| AUTH
    GW -->|"User JWT + publishable key"| REST
~~~

## Request and storage paths

1. **Guest:** [frontend/src/guest.js](../frontend/src/guest.js) reads/writes IndexedDB. There is no server-side guest account store.
2. **Preview:** an explicit import action sends source text to the bounded **/api/import/preview** endpoint. [FastAPI](../backend/guest.py) validates origin and size; [content parsing](../backend/content.py) returns structured data without creating server-stored guest notes.
3. **Sign-in:** [backend/cloud.py](../backend/cloud.py) handles a PKCE email-link flow and encrypted secure HttpOnly session cookies. Browser JavaScript does not read the auth tokens.
4. **Cloud state:** the [frontend adapter](../frontend/src/cloud.js) uses the Render gateway for saves and reloads. [Validation](../backend/cloud_state.py), [RLS and a versioned save RPC](../supabase/migrations/202610160001_private_cloud_workspaces.sql) enforce workspace shape, ownership and stale-write conflicts.
5. **Export:** browser-based backups let users retain their work. Signing in does not transfer guest content automatically.

## Trust boundaries

| Boundary | Data crossing | Limit |
| --- | --- | --- |
| Browser ↔ Render | Static requests, explicitly selected import previews, authenticated cloud operations | Source preview passes through the service; hosting providers may retain network metadata |
| Browser ↔ IndexedDB | Guest notes and progress | Another person with the same browser profile can access them |
| Render ↔ Supabase | Authentication and owner-authorized workspace requests | Render is trusted; this is not end-to-end encryption |
| User ↔ PostgreSQL | Scoped workspace JSON | Database policies and membership checks apply; trusted administrators retain privileged access |

## Code navigation

- **Study experience:** [App](../frontend/src/main.jsx), [Notes](../frontend/src/Notes.jsx), [Exams](../frontend/src/Exams.jsx), [Recall](../frontend/src/ForcedRecall.jsx), [Games](../frontend/src/Games.jsx).
- **State and transport:** [Guest](../frontend/src/guest.js), [Cloud](../frontend/src/cloud.js), [API dispatch](../frontend/src/api.js).
- **Server:** [FastAPI](../backend/guest.py), [HTTP security headers](../backend/headers.py), [Cloud gateway](../backend/cloud.py).
- **Database:** [RLS / RPC migration](../supabase/migrations/202610160001_private_cloud_workspaces.sql), [Cloud security design](CLOUD_SECURITY.md).

The connected Render service deploys from the **render-guest-security** branch rather than main; see [Deployment](DEPLOYMENT.md).
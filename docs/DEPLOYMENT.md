# Deployment and release boundaries

## Connected Render service

As inspected October 29, 2026, the StudyCade Render service is configured with:

- Source: **AlexV4981/StudyCade**, branch **render-guest-security**
- Runtime: **Docker**, context **.**, Dockerfile **./Dockerfile.render**
- Automatic deployment: **off**

The **main** branch is a reviewed, organized public source tree. A commit to main does **not** update the active service. The [Dockerfile](../Dockerfile.render) builds React/Vite assets and runs the FastAPI application under an unprivileged user; [render.yaml](../render.yaml) contains comparable deployment settings.

## Persistence modes

- **Guest:** browser IndexedDB, local backup export, no server-side guest account store.
- **Approved cloud:** Supabase email-link Auth and private, versioned PostgreSQL workspace through the Render gateway.
- **No guest-to-cloud automation:** cloud sign-in never silently uploads guest content.

## Private environment boundary

Optional cloud mode uses four **environment-variable names**: **SUPABASE_URL**, **SUPABASE_PUBLISHABLE_KEY**, **CLOUD_SESSION_KEY**, **CLOUD_ALLOWED_EMAIL_HASHES**. Keep all live values in private deployment configuration, never in source, screenshots, logs, or documentation. Never use a Supabase administrator/service-role key in the web client.

The [SQL migration](../supabase/migrations/202610160001_private_cloud_workspaces.sql) defines restricted membership, row-level security, and a version-aware save RPC. Review the [cloud security design](CLOUD_SECURITY.md) before changing function permissions or RLS.

## Safe release sequence

1. Review diffs for real addresses, tokens, allowlists, coursework, dumps and logs.
2. Build the Docker image and run the [verification checklist](DEVELOPMENT.md).
3. Intentionally integrate approved changes to **render-guest-security** only after review.
4. Validate guest and approved cloud flows with disposable data, including conflict handling.
5. Trigger deployment separately; check health and redacted logs.

A documentation/reorganization commit to **main** does not change Render settings, Supabase data, production secrets or the deployed branch.
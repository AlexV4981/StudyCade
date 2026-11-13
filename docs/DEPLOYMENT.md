# Deployment and release boundaries

## Hosting configuration

The repository contains the Docker build and a sample Render blueprint. Live hosting settings (deployed source branch, automatic deployments, account allowlists and environment values) are managed outside the public repository. Do not assume pushes to `main` or `optimization-and-updates` trigger a release.

The [Dockerfile](../Dockerfile.render) builds React/Vite assets and starts the FastAPI application under an unprivileged user. The [Render blueprint](../render.yaml) documents public deployment structure but must not contain live secrets.

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
3. Integrate approved changes to the configured deployment branch only after an explicit release review.
4. Validate guest and approved cloud flows with disposable data, including conflict handling.
5. Trigger deployment separately; check health and redacted logs.

Documentation and development commits must not change live hosting settings, Supabase data or production secrets.
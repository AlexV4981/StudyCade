# StudyCade guest deployment on Render Free

This deployment contains no account database, local coursework, personal configuration, legacy recovery files or administrator API. Every visitor uses a browser-local guest workspace in IndexedDB. The same browser profile shares its workspace; different browsers/devices do not sync. Export a backup before clearing browser storage or switching devices.

Import **Preview** sends the selected text to this service temporarily for canonical Markdown/CSV parsing. The service does not store it, set identity cookies, call an AI provider, or log request bodies. Render still handles network metadata and infrastructure logs. Saved material, review progress, collections, backup downloads and restores run locally in the browser. Settings includes a clear-device action.

## Deploy

1. Put the contents of this `StudyCade` directory at the root of a Git repository you control. A private repository can be used when your Render Git integration has access. This ZIP is deployment source, not an uploadable Render build artifact.
2. Create a **Web Service**, choose that repository and the **Docker** runtime, and set Dockerfile path to `./Dockerfile.render`, context `.`.
3. Choose the **Free** instance plan. Add no disks, databases, cron jobs or paid services. Use one service and disable automatic deploys if you want to avoid builds on every push.
4. Set health check to `/healthz`. The image uses Render's `PORT` and `RENDER_EXTERNAL_URL` automatically. Set `PUBLIC_ORIGIN` to the exact HTTPS origin only if overriding the Render address or using a custom domain. The image runs only `backend.guest:create_guest_app`; Cloudflare/account settings are unnecessary.
5. Deploy and verify `/api/deployment` returns `mode: guest`, import a disposable note, reload, and download a backup. `/api/admin/users`, `/api/backup`, `/api/restore` and account storage routes intentionally return 404 over HTTP; the browser supplies local backup/restore behavior.

`render.yaml` provides the equivalent free-service settings for a Blueprint deployment. Confirm the plan and billing controls before submitting. Do not enable paid resources or auto-upgrades.

## Sleeping, costs and access

[Render's free-service rules](https://render.com/docs/free) currently specify sleep after 15 idle minutes and wake on inbound requests, with roughly a minute for a cold start. Any visitor or bot can wake a public service. No keep-alive pinger, cron or polling is included. Local server files do not persist across sleep; guest study data remains in the browser instead.

Free services share included instance hours, bandwidth and build minutes with the workspace. Where a payment method is present, excess bandwidth/build usage can produce charges. Inspect the workspace's billing/spending controls, set the applicable build spend limit to zero, and confirm how bandwidth overages are handled. A free instance plan alone is not a guarantee that every possible account charge is disabled. No new payment method or paid resource is required by this app.

## Security boundaries

- No account signup, user emails, shared server session, administrator role, file-storage routes or server backup/restore endpoints.
- Strict same-origin JSON previews; maximum 2 MB source and 5 MB request; preview rate limits and two-request admission before buffering, with bounded parser concurrency.
- TLS at Render, HSTS, restrictive CSP, no framing, no referrers, no cross-origin API policy, no indexing, generic errors, and disabled application access logs.
- Escaped Markdown, blocked remote image fetching, `trust:false` and bounded math expansion/size; safe import/restore validation including prototype keys and render metadata.
- Non-root runtime, separate build stage, minimal pinned Python dependencies and no Node/Vite development server in the running container.

Browser storage is not an encrypted account vault. Anyone with access to the same browser profile can open its saved guest material. No audit can guarantee absence of all vulnerabilities; dependency advisories and the deployment's actual configuration should be rechecked when upgrading.

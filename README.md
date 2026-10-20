# StudyCade on Render Free with optional private cloud saving

The deployment source excludes local coursework, personal configuration, the local account database, legacy recovery files and administrator APIs. Guests use browser-local IndexedDB. Optional Supabase sign-in opens an approved user’s separate cloud workspace on multiple devices. Export regular backups; no automatic guest-to-cloud upload occurs.

Import **Preview** sends the selected text to this service temporarily for canonical Markdown/CSV parsing. The service does not store preview requests, call an AI provider, or log request bodies. Approved cloud saves explicitly persist material in Supabase. Render still handles network metadata and infrastructure logs. Guest material and progress stay in that browser. Signed-in material and progress save through the authenticated cloud gateway. Backup downloads run in the browser. Settings includes a clear-device action.

## Deploy

1. Put the contents of this `StudyCade` directory at the root of a Git repository you control. A private repository can be used when your Render Git integration has access. This ZIP is deployment source, not an uploadable Render build artifact.
2. Create a **Web Service**, choose that repository and the **Docker** runtime, and set Dockerfile path to `./Dockerfile.render`, context `.`.
3. Choose the **Free** instance plan. Add no disks, databases, cron jobs or paid services. Use one service and disable automatic deploys if you want to avoid builds on every push.
4. Set health check to `/healthz`. The image uses Render's `PORT` and `RENDER_EXTERNAL_URL` automatically. Set `PUBLIC_ORIGIN` to the exact HTTPS origin only if overriding the Render address or using a custom domain. The image runs only `backend.guest:create_guest_app`; Cloudflare settings are unnecessary. Without the optional cloud environment variables, no account cookies or cloud endpoints are enabled.
5. Deploy and verify `/api/deployment` returns `mode: guest`, import a disposable note, reload, and download a backup. `/api/admin/users`, `/api/backup`, `/api/restore` and account storage routes intentionally return 404 over HTTP; the browser supplies local backup/restore behavior.

`render.yaml` provides the equivalent free-service settings for a Blueprint deployment. Confirm the plan and billing controls before submitting. Do not enable paid resources or auto-upgrades.

## Sleeping, costs and access

[Render's free-service rules](https://render.com/docs/free) currently specify sleep after 15 idle minutes and wake on inbound requests, with roughly a minute for a cold start. Any visitor or bot can wake a public service. No keep-alive pinger, cron or polling is included. Local server files do not persist across sleep; guest study data remains in the browser instead.

Free services share included instance hours, bandwidth and build minutes with the workspace. Where a payment method is present, excess bandwidth/build usage can produce charges. Inspect the workspace's billing/spending controls, set the applicable build spend limit to zero, and confirm how bandwidth overages are handled. A free instance plan alone is not a guarantee that every possible account charge is disabled. No new payment method or paid resource is required by this app.

## Security boundaries

- No administrator role, arbitrary file-storage route, public sharing endpoint, or server filesystem backup/restore endpoint. Optional cloud sign-in and workspace endpoints are explicitly scoped below.
- Strict same-origin JSON previews; maximum 2 MB source and 5 MB request; preview rate limits and two-request admission before buffering, with bounded parser concurrency.
- TLS at Render, HSTS, restrictive CSP, no framing, no referrers, no cross-origin API policy, no indexing, generic errors, and disabled application access logs.
- Escaped Markdown, blocked remote image fetching, `trust:false` and bounded math expansion/size; safe import/restore validation including prototype keys and render metadata.
- Non-root runtime, separate build stage, minimal pinned Python dependencies and no Node/Vite development server in the running container.

Browser storage is not an encrypted account vault. Anyone with access to the same browser profile can open its saved guest material. No audit can guarantee absence of all vulnerabilities; dependency advisories and the deployment's actual configuration should be rechecked when upgrading.

## Optional private Supabase saving

Use a Supabase Free project. Apply `supabase/migrations/202610160001_private_cloud_workspaces.sql`, then privately approve the normalized email SHA-256 digest in `studycade_private.cloud_allowlist`. Never publish actual addresses, approval hashes, session encryption keys or deployment credentials.

Set all four environment variables together in Render’s private environment settings:

- `SUPABASE_URL`: exact official HTTPS project origin.
- `SUPABASE_PUBLISHABLE_KEY`: publishable key only; never an administrator/service-role key.
- `CLOUD_SESSION_KEY`: separately generated Fernet encryption key.
- `CLOUD_ALLOWED_EMAIL_HASHES`: comma-separated normalized-email SHA-256 hex digests (up to five).

Keep `AUTH_MODE=guest`. Configure Supabase’s Site URL to the app’s exact HTTPS origin and its redirect allowlist to only `https://YOUR-APP.onrender.com/api/cloud/auth/callback`; do not use wildcards. Email templates must use `ConfirmationURL` (the default). The app uses S256 PKCE: request a link in Settings, then open the newest email link in the **same browser on that device within ten minutes**. Repeat sign-in independently on the other device. Tokens remain in encrypted Secure HttpOnly host cookies, never JavaScript storage. Cloud workspace content is held in browser memory; sign-out clears that memory and returns to the separate guest workspace.

Supabase’s built-in mail service is intended for testing, restricts recipients to organization team addresses, and has a very small project email quota (currently two per hour). The approved address must also be an allowed mail recipient. General public email delivery requires a separately configured SMTP provider; none is provisioned here. No paid upgrade or SMTP subscription is part of this deployment. See [Supabase SMTP limits](https://supabase.com/docs/guides/auth/auth-smtp).

A guest cannot read the cloud workspace. SQL owner policies and a live-session/approval check enforce this independently of the UI. Browser-origin checks protect changes, account-bound request headers prevent stale queued writes after an account switch, and revision checks reject concurrent device overwrites. Reload the workspace explicitly when another device has changed it. Cloud writes require connectivity; failures remain visible and do not silently switch storage.

Cloud state is bounded to 20 MB per user and 100 MB aggregate logical JSON. These caps do not cover database overhead. Supabase Free projects may pause after inactivity and need manual resumption; no keep-alive job is included. Keep exports for recovery because this app does not promise managed backups. Guests still work when cloud saving is unavailable.

To disable cloud saving, remove **all four** cloud variables and redeploy; existing Supabase data is retained. Incomplete configuration fails startup rather than enabling partial authentication. Rotating the encryption key signs out existing browser sessions. Review [cloud security and executed checks](docs/CLOUD_SECURITY.md) before changing database grants or authentication.


## Notes and forced recall

Study notes provide selection checkboxes with Study selected and Delete selected actions. Deletion requires an in-app confirmation and removes the notes and their associated saved source files; existing flashcard decks remain usable. Questions have individual progress buttons; explanatory sections have section-bottom progress buttons. Red ✕ Needs practice is the default, yellow ⚑ Review later and green ✓ Complete are manual choices. Selecting an active status keeps it selected; game scores never change these marks. The overview offers Continue reading for the most recently opened note and remembers its section.

While a note is open, expand Optional timed recall, choose one or more decks and uncheck any cards to exclude. Enable the switch to receive a question after a random 3–10 minutes of visible reading, with a 10-second answer deadline. Questions use real distinct answers from selected cards. At least two usable cards are needed; ambiguous prompts and placeholders are excluded. Results count as practice attempts. Continue reading dismisses the feedback and begins the next interval. Escape or Turn off forced recall stops it. Leaving the reader stops scheduling; hidden tabs do not start new questions. An already-open question keeps its wall-clock deadline. Recall selections are held only in page memory and must be chosen again after a reload.

Reading position and section states use the existing owner-private cloud workspace when signed in. This update requires no database migration or broader database permissions. Guest work remains in that browser.

Study on paper is the default practice mode: read a complete question, solve it on paper without a timer, reveal its answer/worked solution, then choose a progress mark. Hints and source details are collapsed. Moving between questions hides their answers and hints again. Notes use Q# · Topic headings and independent question marks; source text is preserved. Existing questions that rely on earlier quantities are flagged rather than filled with invented data.

Source Tutor requests one Q# · Topic heading per self-contained problem, all required givens, a concise ANSWER, separate HINT/SOLUTION blocks, and citations/editorial metadata only in collapsed SOURCE details. Subject IDs remain in imported headings for identification. The app supplies progress controls; generated Markdown must not pre-mark mastery. Optional timed recall is best served by a separate short fact/formula deck. To use generated cards for forced recall, choose **Notes + practice deck** during import, then choose that deck in the notes reader's recall settings.

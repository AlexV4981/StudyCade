# Studycade security review and server checks

This review covers the supplied Studycade source and Compose file. It cannot confirm your Ubuntu firewall, router, Cloudflare dashboard, other containers, or live ports from this workspace. Run the checks below on your own server after installing this release.

## What this release enforces

- **Sign-in:** Every app page, static asset, and API request requires a valid signed Cloudflare Access JWT with the configured issuer and audience, followed by an active matching account in SQLite. The local health check only responds to loopback.
- **Permissions:** The server checks role and set ownership for each operation. A viewer cannot gain editor/admin rights by changing HTML, JavaScript, or requests in browser DevTools. Markdown files are stored and read only beneath the account identified by the validated JWT. Admins cannot read another account's Markdown through the app.
- **Injection:** SQL uses prepared statements with bound values. There is no command execution endpoint, shell invocation, SQL string interpolation from requests, or feature that executes uploaded code. Imported card text and Markdown HTML are escaped; Markdown links allow HTTP(S) and mailto only. KaTeX runs with `trust:false`.
- **Uploads:** `.md`, `.markdown`, and `.txt` only, with validated path segments, a 2 MB per-file limit, a 250-file per-account limit, and exclusive creation to avoid overwriting. Files stay under the named Docker volume; the server does not serve their raw path as a public web asset. Uploads are treated as text.
- **Browser response:** A restrictive Content Security Policy, no-store caching, no MIME sniffing, frame denial, same-origin resource policy, and limited browser permissions. Mutating requests require the configured exact Origin. Rate limits apply per approved account, including uploads and account changes.
- **Container:** The app runs as the unprivileged `node` user with a read-only root filesystem; app and tunnel drop Linux capabilities, prevent privilege escalation, and limit processes. Neither service has a host `ports:` mapping or a Docker socket mount. The database and uploaded files are in the persistent volume.
- **Account history:** Admin account creation, role changes, and disabling are recorded in SQLite and visible to admins under **Manage accounts**. The last 100 events are available to that page.

## Check your Ubuntu server

Run these commands **from your `studycade` folder** after the update. They do not display `.env` values or the tunnel token:

```bash
sudo docker compose ps
sudo docker compose port app 8000
sudo ss -lntup
sudo ufw status verbose
sudo docker volume ls
```

- `docker compose ps` should show `app` healthy and `cloudflared` running. It may show `8000/tcp` as an **internal** container port. It must **not** show `0.0.0.0:8000->8000/tcp` or `[::]:8000->8000/tcp`.
- `docker compose port app 8000` should show no published host address. A nonzero exit code or “no public port” is expected here.
- In `ss`, look for unexpected listeners on `0.0.0.0` or `[::]`, especially `8000`. The command includes **other services** on your server, which need their own review. Do not close your SSH port blindly.
- In `ufw`, confirm the firewall is active and its inbound rules are intentional. Docker port publishing can bypass an ordinary UFW rule, so verify the Compose and `ss` outputs too. Check your router for old port forwarding rules.
- The Docker volume should still contain your existing SQLite database. Never use `docker compose down -v` for this app.

## Check Cloudflare and accounts

1. The published hostname matches your Access application and `PUBLIC_ORIGIN` exactly. The tunnel route points to `http://app:8000`. Enable **Protect with Access** on the route when the dashboard offers it; the app also validates the JWT itself.
2. The Access Allow policy contains only specific approved email addresses or a tightly managed identity group. No Everyone, broad email-domain, Bypass, or wildcard rule applies. Require MFA through your identity provider, or secure each email account with MFA if using emailed one-time PIN codes.
3. In a fresh private browser session, the HTTPS address shows Cloudflare sign-in before Studycade. An unapproved email cannot enter. Recheck the app's **Manage accounts** list for inactive people and unnecessary admin roles.
4. To revoke someone, disable their account in Studycade, then remove them from the Cloudflare Access Allow policy and end their Cloudflare Access session if needed. The configured initial admin cannot be disabled while it remains `INITIAL_ADMIN_EMAIL`; change that setting to a new approved admin first if you need to retire the recovery account.
5. Keep `.env` readable only to your server administrator (`chmod 600 .env`). Keep the token at `secrets/tunnel_token` inside a `chmod 700 secrets` folder; the file is `chmod 644` so the unprivileged connector can read its mounted copy. This release passes only its path to `cloudflared`, not the token on the command line. Do not paste `.env`, secret files, or logs containing credentials into a public chat. Treat membership in the `docker` group as root-level server access.

## Backups and updates

- `sudo docker compose exec -T app node tools/backup.js` creates a **SQLite-only** backup inside the same volume. Back up the **entire Docker volume** to another device to include uploaded Markdown. Periodically test a restore.
- Rebuild the app from updated source and rerun `npm audit --omit=dev` when you update dependencies. Update Ubuntu, Docker, and the `cloudflared` image regularly. The previous MathLive package had a reported XSS issue; this release uses patched `0.110.0`.
- Review Cloudflare Access logs and the app's account-change history after unexpected sign-ins or role changes. Rotate the tunnel token if it was exposed.

## Limits of this review

The public hostname remains reachable at Cloudflare's edge, where Access should block unauthorized users. No app can make an internet-facing service risk-free. The app container still needs outbound network access to retrieve Cloudflare signing keys; this Compose file does **not** fully prevent a hypothetical code-execution exploit from reaching other devices on the same LAN. For stronger lateral-movement isolation, place this service on a dedicated VM or network segment and apply tested egress firewall rules. Do not apply a generic firewall script on a shared home server without mapping its other services first.

Browser DevTools can always inspect downloaded JavaScript and let a legitimate user send requests as themselves. The server's authentication, authorization, validation, and audit rules are what prevent that from becoming another person's privileges. Cloudflare dashboard administrators and users with Docker daemon access are outside the app's account boundary and must be tightly controlled.

# Studycade — self-hosted edition

## Quick code review (direct links)

Reviewers can verify the implementation directly without installing the app: [JWT validation](auth.js) · [role checks and API routes](server.js) · [per-user file isolation](files.js) · [SQLite persistence](db.js) · [account and API tests](tests/app.test.js) · [file access tests](tests/files.test.js) · [Compose hardening](compose.yaml) · [security scope and limitations](SECURITY_CHECKLIST.md).

[Return to the repository's reviewer index](https://github.com/AlexV4981/StudyCade/blob/main/README.md).

After installing, follow [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md) to verify the live server's ports, Cloudflare policy, account roles, and backups. Source-code checks cannot inspect your Ubuntu host or Cloudflare dashboard.

## Better MD Viewer

Select **Better MD Viewer** in the top tabs. Its first screen explains how to use it and provides a **Copy prompt** button that asks an AI for a compatible study recap. Save the response as `.md`, enter a folder name, then upload the file or drag it onto the viewer. The file is saved in the named Docker volume under `/data/studycade-files/<account email>/<your folder name>/<file name>`. For an ordinary address such as `zack@example.com`, the account folder is exactly that address. Unusual characters in addresses are encoded in folder names. Only the signed-in owner can list, open, or delete these files through the app, including when the owner is an admin. Uploading a duplicate file name adds a numbered copy instead of overwriting it. Review and confidence choices stay in that browser's local storage, scoped to the account, folder, name, and content; reopen the same file in the same browser to restore them. Back up the Docker volume to preserve saved files.

The viewer supports headings (each `##` topic becomes a reviewable outline entry), paragraphs, links, bold/italic text, lists, tables, code fences, blockquotes, and `> [!RECALL]`, `> [!ANSWER]`, `> [!RULE]`, `> [!EXAMPLE]`, and `> [!MISTAKE]` callouts. Answer callouts collapse until opened. KaTeX and mhchem render `\\(...\\)`, `\\[...\\]`, `$...$`, `$$...$$`, and `\\ce{...}` inside math. Unicode subscripts and simple Markdown `~subscript~` / `^superscript^` work as well. Raw HTML is displayed as text for safety. Standard `.md`, `.markdown`, and `.txt` files up to 2 MB can be opened. Print / PDF uses the browser's print dialog.

The app limits each account to 250 files, with 2 MB per file. The folder name is supplied when uploading; names with slashes or path control characters are rejected. Deleting the last file in a folder removes that empty folder.

The app limits repeated requests and records account changes in an admin-only audit history. It uses MathLive 0.110.0, which fixes a reported HTML escaping vulnerability in earlier versions. Security headers and container capability restrictions are included in this release.

To update an existing installation, follow [UPDATING.md](UPDATING.md) in order. Preserve the real `.env` and named Docker volume, and move the old tunnel token to `secrets/tunnel_token` before starting. The viewer adds no new database migration. The Compose project identity stays `chem-arcade-server` internally to reuse the existing volume even after you rename the application folder to `studycade`. If you previously ran Compose with a custom project name, set the same `COMPOSE_PROJECT_NAME` when updating. Keep the Cloudflare service URL at `http://app:8000`.

A multiuser flashcard app with six study modes, SQLite storage, Cloudflare Access sign-in, and roles. It starts with 135 course-based cards in nine sets. Anyone you approve can study shared sets; editors can import their own sets. There are no passwords in this app: Cloudflare Access handles sign-in and the app validates its signed token on every request.

The set library is searchable and paged 25 sets at a time. Opening a set loads only that set's cards, then shows its study modes and a terms list. The installation accepts up to **1,000 sets** total (including built-in sets) and supports separate accounts and progress for at least five people. SQLite WAL mode, a busy timeout, and indexes support that workload. The app runs as one Node process; if you later need many simultaneous users or much larger datasets, benchmark and consider a different database and deployment topology.

## Requirements

- Docker Engine with the Docker Compose plugin on your server.
- A domain managed by Cloudflare, a Cloudflare Zero Trust team, and a remotely managed Cloudflare Tunnel.
- Node 24 only if you want to run the source outside Docker. The Docker image includes Node; no `npm install` is required.

## Set up Cloudflare first

1. In **Zero Trust → Access controls → Applications**, create a **self-hosted** application for a hostname such as `chem.example.com`. Add an **Allow** policy for the people or identity group who may reach the app. Include your own sign-in email. Create this application **before** making the tunnel hostname live.
2. Copy the application's **Application Audience (AUD) Tag** from its additional settings. Note your Zero Trust team domain, which looks like `https://your-team.cloudflareaccess.com`.
3. In **Networking → Tunnels**, create a remotely managed tunnel and copy its connector token. Add a **Published application** route for the same hostname. Set its service URL to **`http://app:8000`**. This `app` name is Docker Compose's internal service name; do not set it to `localhost` from inside the tunnel container.
4. Copy `.env.example` to `.env` in this directory. Fill in `CF_ACCESS_TEAM_DOMAIN`, `CF_ACCESS_AUD`, `INITIAL_ADMIN_EMAIL`, and `PUBLIC_ORIGIN` (for example `https://study.example.com`). Run `chmod 600 .env`. The initial admin email must match the identity that Cloudflare Access returns. Put the tunnel token **alone** in `secrets/tunnel_token`: make the folder with `mkdir -p secrets && chmod 700 secrets`, edit the token file with `nano secrets/tunnel_token`, then run `chmod 644 secrets/tunnel_token`. The private parent folder stops other ordinary host users from opening it; the file itself must be readable inside the connector container. Never commit or share that file.
5. From this directory run:

   ```bash
   docker compose up --build -d
   docker compose ps
   ```

6. Open your HTTPS hostname and sign in through Cloudflare Access. Your initial admin account is preapproved. Use **Manage accounts** to approve other emails and assign roles. Their email must also satisfy your Cloudflare Access Allow policy; an approval in this app alone cannot override that policy.

There is **no host port mapping** in `compose.yaml`: only the `cloudflared` container talks to the app. Do not add a public port mapping unless you have another protected route to the origin. The app checks the signed `Cf-Access-Jwt-Assertion` header, matching key ID, issuer, audience, expiry, and email. It never treats an unverified identity header as a login. The health endpoint returns only `{ "status": "ok" }`.

## Roles and sets

| Role | Can study | Can import/edit/delete | Can manage accounts |
| --- | --- | --- | --- |
| Viewer | Shared sets | No | No |
| Editor | Shared and own private sets | Own imported sets | No |
| Admin | All sets, including private | All imported sets | Yes |

Built-in lecture sets are shared and read-only. An imported set can be **private** (owner and admins) or **shared** (all approved accounts). Disabling an account takes effect on its next request. The configured initial admin remains active and admin on restart, providing a recovery account. Progress is stored separately for each account and set.

## Import from Quizlet or elsewhere

Quizlet's official **Export** feature lets the creator copy terms and definitions from an individual set on the website. Choose a **tab** between term and definition and a **new line** between cards; copy the text. In Studycade, choose **Import set**, paste it, name the set, and choose who may study it. Do this once for each Quizlet set. Quizlet does not permit exporting a copied set from someone else through this feature, so there is no link scraper or folder URL importer here.

The same screen accepts `.txt`, `.tsv`, and `.csv` files. Choose tab, comma, or semicolon as the field separator. Quoted CSV fields and embedded newlines are supported. Each set needs 4–2,000 unique terms. The server limits uploads to roughly 1 MB. Import/edit replaces one full set at a time; it does not merge another file into an existing set.

### Equations and chemistry notation

Card terms and definitions accept LaTeX between `\(...\)` for inline math, `\[...\]` for display math, or `$...$` and `$$...$$`. For example, `The volume is \(V=\pi r^2h\)` and `\(\ce{H2O + CO2 -> H2CO3}\)` render as formatted math and chemical equations. Plain text still displays normally. The **Insert equation** button in the import dialog opens a visual math field with a keyboard for fractions, roots, and powers; it inserts LaTeX at the cursor in the import text. Keep a tab between each term and definition and a newline between cards. The server stores the original text and LaTeX, so exports preserve the source. MathLive and KaTeX are packaged with the app image and served locally; the browser does not need to contact a CDN.

## Games and data

Flashcards, Memory, Match pairs, multiple-choice blanks, word-bank blanks, and Meteor Defense are in the browser. Meteors work with mouse/touch or keys 1–4; the server saves right and wrong counts. **Export your own sets** downloads your imported sets and progress as JSON. The nine built-in sets originate from the supplied CHEM 1341 lecture and homework PDFs and are not an exact copy of the linked Quizlet folder.

SQLite lives in the named Docker volume `arcade_data` at `/data/arcade.db`. It uses WAL and foreign keys. Back up online with:

```bash
docker compose exec -T app node tools/backup.js
```

The script prints the new database backup path inside `/data/backups`, which is in the same persistent volume. It backs up SQLite, **not the uploaded Markdown files**. Back up the entire named volume to include both the database and `/data/studycade-files`. To update the code, preserve `.env` and the Docker volume, then run `docker compose up --build -d`. To stop without deleting the database and files, use `docker compose down` **without** `-v`.

### Updating an existing installation

Keep your existing `.env` and Docker volume. Make a backup first and follow [UPDATING.md](UPDATING.md) to move the tunnel token into its private file. Replace the app source files with this release, including `package-lock.json`, then run `docker compose up --build -d` from the directory with `compose.yaml`. New database indexes and the account audit table are added automatically at startup. Do not run `docker compose down -v`; that deletes stored sets, progress, and uploaded files. If you copied an old `.env` into the new directory, confirm its four app settings before starting. When replacing a directory, do not overwrite your actual `.env` with `.env.example`.

## Local checks

```bash
npm test
```

Tests use Node's built-in runner and cover signed token validation, import parsing, account approval and audit visibility, role restrictions, private/shared access, request origins, SQL injection strings, per-account file isolation, path traversal, upload limits, saved progress, and all six client game modes. They do not call Cloudflare. A real Cloudflare sign-in and tunnel need your configured account and hostname.

## Official setup references

- [Cloudflare: publish a self-hosted Access application](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/)
- [Cloudflare: validate Access JWTs](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/)
- [Cloudflare: set up a Tunnel](https://developers.cloudflare.com/tunnel/get-started/)
- [Quizlet: export your sets](https://help.quizlet.com/hc/en-us/articles/360034345672-Exporting-your-sets)

# Update your existing app to Studycade

Run these commands on your Ubuntu server. Replace the example paths if your current folder is elsewhere. The ZIP has a top-level `studycade` folder and does **not** contain your real `.env` or database.

1. In the current app folder, back up SQLite and stop the old containers:

   ```bash
   cd ~/chem-arcade-server
   sudo docker compose exec -T app node tools/backup.js
   sudo docker compose down
   ```

   **Do not add `-v` to `down`.** That would delete the database volume. If the app is not running, skip the backup command and continue, preserving the volume.

2. Rename the current folder, keeping its `.env`:

   ```bash
   cd ~
   mv chem-arcade-server studycade
   ```

3. Put `Studycade_Server_Update.zip` in your home folder, then extract it into a *temporary* folder and copy its app files over the renamed folder:

   ```bash
   mkdir -p ~/studycade-update
   unzip ~/Studycade_Server_Update.zip -d ~/studycade-update
   cp -a ~/studycade-update/studycade/. ~/studycade/
   ```

   The archive has `.env.example`, but no `.env`; your working `.env` stays in `~/studycade`. The named Docker volume keeps your accounts, flashcards, progress, and new Markdown uploads.

4. Move the old tunnel token out of `.env` and into a private file **before starting** the new connector. Run this from `~/studycade` if your existing `.env` has a `TUNNEL_TOKEN=` line:

   ```bash
   cd ~/studycade
   mkdir -p secrets
   chmod 700 secrets
   awk '/^TUNNEL_TOKEN=/{sub(/^TUNNEL_TOKEN=/,"");print;found=1;exit} END{if(!found)exit 1}' .env > secrets/tunnel_token
   test -s secrets/tunnel_token
   chmod 644 secrets/tunnel_token
   ```

   None of these commands print the token. The `secrets` folder is accessible only to your server account; the token file must be readable by the connector inside Docker. If `test -s` fails, stop here and check whether the old `.env` contains the token. If you already have a working `secrets/tunnel_token`, keep it rather than overwriting it.

5. Start Studycade and check both containers:

   ```bash
   cd ~/studycade
   sudo docker compose config --quiet
   sudo docker compose up --build -d
   sudo docker compose ps
   ```

6. When the tunnel is healthy, remove the old token line from `.env` without displaying it:

   ```bash
   sed -i '/^TUNNEL_TOKEN=/d' .env
   chmod 600 .env
   ```

7. Open your existing HTTPS address, sign in, then choose **Better MD Viewer**. Enter a folder name, upload a `.md` file, go back to **My saved files**, and reopen it. A second approved account should not see the first account's file.

**Keep your Cloudflare route** at `http://app:8000` and keep the other existing `.env` values. The Compose project still uses the old internal project identifier to find your existing volume, even though the app and folder are named Studycade. If you previously started Compose with a custom `-p` project name or `COMPOSE_PROJECT_NAME`, use that same name in both the stop and start commands. Check `sudo docker volume ls` before changing it.

The SQLite backup command does not include uploaded Markdown. Back up the entire Docker volume regularly once people begin uploading files. Never run `docker compose down -v` for this app.

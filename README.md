# StudyCade | Self-hosted learning application

**A Node.js / SQLite study app packaged with Docker Compose.** This repository contains the application source, account and study-file controls, automated tests, a deployment guide, and a security checklist.

## Start here: recruiter / code reviewer links

Each link opens the **actual implementation or evidence**, not just another overview.

| What to inspect | Direct evidence | What the source shows |
| --- | --- | --- |
| Authentication | [Signed-session / Cloudflare JWT validation](https://github.com/AlexV4981/StudyCade/blob/main/Studycade_Server_Update/studycade/auth.js) | Token signature, issuer/audience/expiry and identity validation |
| Account roles and access checks | [Server API and authorization rules](https://github.com/AlexV4981/StudyCade/blob/main/Studycade_Server_Update/studycade/server.js) | Account approval, role enforcement, and study-set permissions |
| Per-account file access | [File handling and path checks](https://github.com/AlexV4981/StudyCade/blob/main/Studycade_Server_Update/studycade/files.js) | Owner-scoped uploads, path validation and file restrictions |
| SQL and saved progress | [SQLite schema and queries](https://github.com/AlexV4981/StudyCade/blob/main/Studycade_Server_Update/studycade/db.js) | Persistent records, database access, and parameterized statements |
| Tests | [Server tests](https://github.com/AlexV4981/StudyCade/blob/main/Studycade_Server_Update/studycade/tests/app.test.js) · [File-isolation tests](https://github.com/AlexV4981/StudyCade/blob/main/Studycade_Server_Update/studycade/tests/files.test.js) | Validation of roles, request handling, upload restrictions and account isolation |
| Container configuration | [Compose configuration](https://github.com/AlexV4981/StudyCade/blob/main/Studycade_Server_Update/studycade/compose.yaml) · [Dockerfile](https://github.com/AlexV4981/StudyCade/blob/main/Studycade_Server_Update/studycade/Dockerfile) | Service configuration and container restrictions |
| Security rationale and limits | [Security checklist](https://github.com/AlexV4981/StudyCade/blob/main/Studycade_Server_Update/studycade/SECURITY_CHECKLIST.md) | Controls documented in source, checks to perform on a live host, and acknowledged limitations |
| Setup and operation | [Full application README](https://github.com/AlexV4981/StudyCade/blob/main/Studycade_Server_Update/studycade/README.md) · [Update notes](https://github.com/AlexV4981/StudyCade/blob/main/Studycade_Server_Update/studycade/UPDATING.md) | Installation, environment, usage, backups and updates |

[**Browse the entire source folder**](https://github.com/AlexV4981/StudyCade/tree/main/Studycade_Server_Update/studycade)

## What this project demonstrates

- A multi-mode learning interface backed by Node.js and SQLite, with account-specific state.
- Request-side authorization and file isolation documented in the source and exercised by tests.
- Docker-based packaging, security-oriented configuration, and a backup/update workflow.

**Scope:** These links demonstrate the public code and documented behavior, not an independent security audit, production-scale deployment, or proof that every line was written without tooling. External Cloudflare policies and live server configuration cannot be verified from this repository alone.

## Related infrastructure projects

- [Debian Network Service Lab](https://github.com/AlexV4981/debian-network-service-lab) — Python protocol handling, wake/idle automation, systemd, and documented firewall policy.
- [Ubuntu Network Service Lab](https://github.com/AlexV4981/Ubuntu-network-service-lab) — Java/Flask integration, SQLite audit history, and structured-event ingestion.

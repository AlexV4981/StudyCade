# Security and privacy

StudyCade can process private notes, progress and cloud identities. This public repository documents application code and database authorization logic, **not** production secrets or personal user data.

## Data boundaries

- Guest work remains in browser IndexedDB, not an encrypted vault for shared browser profiles.
- Explicitly submitted import previews cross the network to FastAPI for transient parsing.
- Approved cloud accounts use Supabase Auth and private owner-scoped PostgreSQL storage through the Render gateway. Session tokens use encrypted secure HttpOnly cookies. This is **not** end-to-end encryption.
- Input controls, RLS, membership checks and stale-write protection are described in [Architecture](docs/ARCHITECTURE.md) and [cloud security design](docs/CLOUD_SECURITY.md).

## Do not commit

Private environment values, cloud session keys, service-role tokens, email allowlist entries or hashes, personal coursework, backups, user records, local databases, browser session material, raw logs, recovery archives or computer-specific identifiers.

Removing a file from the current tree **does not erase it from Git history**. Rotate credentials and review history remediation separately if any have been exposed.

## Vulnerability reporting

Use GitHub private vulnerability reporting if enabled. Never put usable exploits, actual login tokens, emails or private workspaces in a public issue. This documentation is not an independent security certification.
# Cloud workspace security model

This document describes the **public security design**, not the configuration, availability, or security assessment of any live deployment. The implementation source of truth is [the gateway](../backend/cloud.py), [workspace validator](../backend/cloud_state.py), and [database migration](../supabase/migrations/202610160001_private_cloud_workspaces.sql).

## Data boundaries

- **Guest workspace:** remains in the user's browser IndexedDB. A guest's notes are not automatically uploaded when the user signs in.
- **Cloud workspace:** an approved signed-in user's data is stored in a per-owner Supabase PostgreSQL row and accessed through the same-origin FastAPI gateway. Cloud data is not written to the guest IndexedDB cache.
- **Import preview:** when the user explicitly previews a file, selected content is submitted to the gateway for bounded parsing. Previewing is distinct from saving.
- **Exports:** the user's backup downloads are private data and should not be committed, logged, or distributed.

This is **not** end-to-end encryption: the trusted application server and database service process cloud content.

## Authentication and authorization

The implementation uses a browser-bound PKCE email-link flow and encrypted, Secure, HttpOnly session cookies. The gateway validates requests and does not expose provider access or refresh tokens to browser JavaScript.

The database migration defines an owner-scoped workspace protected by row-level security (RLS). Server-side membership checks use the authoritative authenticated identity, not a client-supplied owner ID, email, or user-editable metadata.

Workspace changes go through a version-aware save function. A stale version is rejected rather than silently overwriting another device's changes. The gateway and database independently validate input; browser validation is only a convenience and must not replace either trusted boundary.

**Never** place administrator/service-role credentials, email approvals or hashes, provider session records, or user workspaces in this repository, generated graphs, CI logs, or public issues.

## Implementation principles

1. Validate untrusted input at each trust boundary, with bounded size and nesting.
2. Preserve ownership checks and RLS for every read and write path.
3. Maintain explicit separation between guest-local and cloud-remote persistence.
4. Keep sensitive cookie values, auth codes, session tokens and imported study content out of logs.
5. Use least-privilege database access, fixed redirect destinations, CSRF/origin checks, and session invalidation.
6. Test expected-version conflicts, anonymous/unapproved denial, malformed workspace rejection, and guest/cloud isolation in disposable environments.
7. Review every auth, schema, or authorization change as a separate security-sensitive change.

## Public verification guidance

For an isolated test deployment with disposable accounts and material, verify sign-in, sign-out, owner isolation, save-version conflicts, failed requests, and guest-to-cloud separation. The exact test commands, credentials, account identifiers, environment values, active deployment details, and raw logs should stay in approved private operations documentation.

Previous deployments or test results do not guarantee the current service's configuration. See [development verification](DEVELOPMENT.md) and [security reporting](../SECURITY.md) for general guidance.

## References

- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase database functions](https://supabase.com/docs/guides/database/functions)
- [Supabase PKCE authentication](https://supabase.com/docs/guides/auth/sessions/pkce-flow)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

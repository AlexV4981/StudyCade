# Private cross-device cloud workspace

Status, 2026-10-17: migration applied to the authorized empty Free project. The rollback SQL fixture completed through the connected Supabase database, and subsequent counts confirmed zero fixture users, workspaces or approvals before the real private approval was added. These are real PostgreSQL RLS/RPC checks, not a substitute for a real email sign-in and cross-device UI check. Render’s Docker build completed and the cloud-enabled image is live. Anonymous access, fixed callback destinations, private-route denial and security headers passed real HTTP checks. The approved user completed the real email-link sign-in. A privileged, content-minimized database check confirmed an active Auth session and a persisted workspace; the user then refreshed their signed-in browser and confirmed that the cloud workspace and Welcome deck remained. The automation browser stayed a separate guest. A second physical device and two separate approved real identities were not exercised; owner-isolation and conflict behavior are covered by database fixtures and application tests.

## Contract

Migration: `supabase/migrations/202610160001_private_cloud_workspaces.sql`.

- `public.studycade_workspaces`: one row per `auth.users.id`; authoritative `owner_id`, JSONB `state`, monotonically increasing bigint `version`, `updated_at`, and generated `state_bytes`.
- Authenticated, approved owners may SELECT their own row. A different owner sees no rows. Anonymous API callers receive no table privileges. No authenticated direct INSERT, UPDATE or DELETE grant exists.
- `public.studycade_save_workspace(expected_version bigint, workspace jsonb)` is the sole client write capability and returns a **scalar bigint**. Expected version 0 creates version 1; later writes require the current version and increment it. A row absent at a nonzero expected version is also a conflict.
- Error SQLSTATEs: `42501` membership denied, `22023` invalid input, `PT409` version conflict, `PT507` aggregate quota reached. Supabase/PostgREST maps PT409/PT507 to HTTP 409/507. A conflict must preserve both versions for explicit reconciliation; never overwrite by blind retry.
- The RPC has no owner-ID parameter. Any owner-looking value inside JSON is untrusted workspace content and cannot change the authoritative row key. The BFF validates all loaded/saved workspace contents before the UI uses them, including nested metadata, prototype-related keys, safe numeric values and total-card limits.

The BFF uses the project publishable key plus the caller's verified access JWT. **No service-role key is needed or deployed.** Encrypted HttpOnly cookies, CSRF/origin checks, email-link throttling, account-switch protection, session refresh and ETags are application responsibilities, not guarantees provided by this migration. Never log tokens, email-link codes, full workspace bodies or decrypted cookie contents.

## Membership and private data

`studycade_private.cloud_allowlist` holds only lowercase SHA-256 hex digests of UTF-8 `lower(trim(auth.users.email))`. An administrator manages approvals through a privileged database channel. Do not include approval addresses, hashes or credentials in source control or public deployment bundles. Email hashes are deterministic identifiers, **not encryption**; a private allowlist still requires restricted access and careful backups.

`studycade_private.is_cloud_member()` derives `auth.uid()` from the JWT context and independently checks the authoritative Auth user row: confirmed email, permanent (`is_anonymous = false`), not currently banned, approved normalized-email hash, and `auth.jwt().session_id` matching an existing `auth.sessions` row belonging to the same user. Neither caller-supplied email nor user-editable metadata grants approval. This protects both SELECT policies and the RPC.

Removing approval, banning/deleting the user, or removing the corresponding Auth session blocks subsequent database statements even if a previously issued access JWT has not expired. The live-session check follows Supabase's documented session-id pattern; it depends on the project Auth schema and normal server-side sign-out/session removal. Clearing only a browser cookie is not session revocation. Session timeout/refresh policy remains an Auth configuration responsibility.

There is no private Storage bucket, public attachment upload, executable upload route or public workspace-sharing endpoint in this design. Study material is text inside the owner's workspace JSON. Browser-local guest mode stays separate from cloud accounts; it must not silently upload guest content or merge workspaces on an account switch.

## Why SECURITY DEFINER is used

Two tightly scoped functions run with the migration owner's privileges:

1. The private membership helper must read protected `auth.users`, `auth.sessions` and allowlist records. It returns only the current caller's membership boolean.
2. The public save RPC must write a table whose direct DML privileges are deliberately revoked.

Both use `SET search_path = ''` and fully qualified tables/Auth functions. The functions contain no dynamic SQL and accept no authoritative owner identifier. PUBLIC, anon and service_role EXECUTE grants are explicitly revoked. Authenticated receives only the save RPC EXECUTE grant and the private helper EXECUTE grant needed by the stored policy; private-schema USAGE remains revoked, so the helper is not a directly addressable Data API endpoint. Do not add the private schema to Supabase's exposed schemas.

The workspace and allowlist enable **and force RLS**. No write policy exists. The only SELECT policy checks both owner equality and membership. PostgreSQL superusers/BYPASSRLS roles and trusted project administrators remain privileged by design; FORCE RLS does not make project administrators untrusted or make a service-role credential safe to publish.

## Bounds, CAS and quota

The table and RPC reject non-object state, unsupported workspace version, missing/invalid positive `nextCard`, missing/non-array collections, excessive collection lengths and state exceeding 20,000,000 serialized JSONB-text bytes. The BFF performs deeper validation; database structural checks are not a sanitizer or an HTML renderer.

The RPC acquires one fixed transaction-scoped advisory lock before reading current version/size, locking the owner's row, calculating aggregate bytes, and inserting/updating. The maintained byte column supports quota accounting without re-serializing every workspace. This serializes cooperating RPC writes, preventing concurrent first-insert, stale-write and aggregate-quota races. A stale expected version rejects with PT409. Authenticated callers cannot bypass it with direct DML.

The aggregate logical-state cap is 100,000,000 bytes, below a 500 MB free database allowance. This is **not a physical-disk guarantee**: indexes, Auth data, WAL, MVCC row versions, system catalogs, backups and unrelated tables also consume space. Monitor actual storage; do not use the free-tier maximum as a target. Administrator writes and other privileged SQL can bypass this RPC's quota, so operational scripts must preserve its assumptions.

## Rollback fixture and release gate

`supabase/tests/private_cloud_workspaces.sql` creates synthetic users/sessions inside a transaction and ends with ROLLBACK. It checks privileges/FORCE RLS, anon denial, approved owner access, wrong-owner invisibility, forged owner data, direct-write denial, membership failures, wrong/deleted sessions, CAS conflict, malformed/oversized state and aggregate quota rejection. It uses generated fixture addresses and contains no deployment credentials or real approval addresses.

Run only against an isolated project with the matching Supabase Auth schema. The fixture deliberately allocates roughly 102 MB of logical workspace text to test quota rejection and can generate additional WAL; do not run it on a production/free project near its storage cap. Use the project administrator connection with psql's `ON_ERROR_STOP=1`; apply the migration once, then run the rollback fixture. Preserve the exact error output when diagnosing schema differences, without publishing connection strings.

Further signed-in deployment checks (do not infer them from the rollback fixture):

- Fixtures complete successfully and no fixture users/workspaces remain afterward.
- Two separate real approved identities cannot SELECT or save each other's workspace through REST/RPC.
- Publishable-key-only requests and unapproved/anonymous/unverified identities are denied.
- Concurrent saves at the same version yield one success and one conflict; concurrent near-cap saves cannot exceed the quota.
- A captured test access JWT stops accessing the workspace after its server-side session is removed.
- BFF cookie/CSRF/account-switch/error handling is tested separately; no service-role key or personal workspace appears in the published image, frontend bundle or logs.

## Evidence and limits

The implementation follows Supabase's [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security), [function privilege and SECURITY DEFINER guidance](https://supabase.com/docs/guides/database/functions), [anonymous-user distinction](https://supabase.com/docs/guides/auth/auth-anonymous), and [live session-id validation guidance](https://supabase.com/docs/guides/auth/sessions). Anonymous sign-in users can carry the authenticated database role, which is why membership explicitly rejects anonymous Auth rows. The stored policy is necessary even when the BFF already checks approval.

These files do not certify the future project configuration, JWT-signature verification at the Supabase gateway, mail delivery security, production deployment secrets, provider backups or BFF implementation. The real database rollback fixture passed. Browser/server boundary tests and dependency audits are recorded below; real email sign-in and user-confirmed signed-in reload passed separately from the mocks.

## Application threat model and controls

Trust boundaries are browser → same-origin Render gateway → Supabase Auth/Data API → PostgreSQL. Assets are private coursework, source text, study progress, email identities and session credentials. Guests, uploaded text, IDs, provider responses and queued requests are untrusted.

- Spoofing/elevation: email proof with S256 PKCE, approved normalized-email digest, authenticated user identity, database ownership, permanent confirmed Auth row and live session. No admin key in the runtime.
- Tampering: HTTPS, exact-origin JSON mutations, host checks, immutable account header, strict nested workspace validation and compare-and-swap versions. Client-supplied ownership is never authoritative.
- Disclosure: tokens only in encrypted host-only HttpOnly cookies, private schema without API grants, no public file bucket, escaped Markdown, restricted CSP, no referrers, no response caching, no request bodies or access logs. Provider administrators remain trusted; this is not end-to-end encryption.
- Denial of service: body/depth/collection/card limits, two-operation admission before large buffering, bounded upstream pools/responses/timeouts, separate preview/cloud rate limits, strict mail-request throttles, logical storage quotas.
- Repudiation: Supabase Auth audit events are available to project administrators. Application request-body logging is intentionally disabled to minimize retained coursework and credentials. Provider infrastructure may retain network metadata.

The login verifier is generated server-side and retained for ten minutes in a separate encrypted `__Host-` cookie with Secure, HttpOnly, SameSite=Lax. Lax permits the cross-site email callback. The callback accepts one UUID code and no caller redirect URL, verifies the pending browser binding and expected approved email, exchanges it only with the fixed project, and redirects to a fixed local destination. Supabase enforces single use. Auth access/refresh tokens use a separate SameSite=Strict session cookie with a 30-day absolute limit; refresh cannot extend that limit. Callback failures clear the pending cookie and reveal no provider detail or token. The browser must complete the link on the device/profile that requested it.

Guest data persists in IndexedDB. Cloud data stays in memory and in the approved owner’s database row; it is not written into IndexedDB/localStorage/sessionStorage. A shared device/profile can still expose an active signed-in session. Sign out on shared devices. Supabase Auth retains the sign-in email for authentication; database administrators manage account removal and the FK cascade removes the associated workspace. Exports and provider retention/backups must be handled separately. Private approval digests also require administrator removal when access is retired.

## Executed checks and remaining limits

- Backend mocked-HTTP tests cover cookie secrecy, origin/host/type gates, anonymous denial before body read, account mismatch, ETag authorization, refresh races, logout/revocation, validation and provider failure. PKCE adversarial cases cover missing/tampered/expired browser binding, verifier mismatch, duplicate code, extra redirect, wrong account and replay.
- Frontend tests cover isolated cloud/guest stores, no guest reads/uploads at sign-in, account generation checks, stale revisions, lost acknowledgements and no browser token storage. A deliberate account-check mutation made its targeted security test fail, then the original source was restored.
- Real SQL fixture covers permissions, forced RLS, owner isolation, approved/revoked/unconfirmed/anonymous membership, wrong/deleted live sessions, direct-write denial, malformed/oversized state, CAS and quota rejection. Synthetic SQL claims do not themselves prove Auth gateway JWT verification or email delivery.
- Native pnpm audit of the frozen lock (168 packages) and pip-audit of the minimal 22 Python pins reported no known advisories on 2026-10-17. This does not establish absence of undisclosed vulnerabilities. Existing large frontend chunks remain a performance limitation; they are not a security exception.
- Supabase Advisor flags an RLS table without policies for the private allowlist (intentional deny-all) and authenticated execution of the save SECURITY DEFINER RPC (intentional sole write capability). Both were reviewed against their documented purpose and retained with fixed search paths, narrow grants and explicit authorization.
- Free single-instance in-memory request limits reset on restart and do not replace provider-level limits. This deployment has no paid shared limiter, keep-alive job or additional service. No active external penetration testing or future vulnerability guarantee is claimed.

References: [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/), [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html), [Supabase PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [Supabase SMTP limits](https://supabase.com/docs/guides/auth/auth-smtp).

Supabase Advisor additionally reports leaked-password protection disabled. This provider feature requires Pro; no upgrade was made. StudyCade exposes only email-link sign-in and does not accept, set or reset user passwords. Supabase may maintain an internally generated password hash for a newly created email-link identity. This warning must be revisited if password-based login is introduced; it is not a reason to expose a password endpoint or weaken email verification. See [Supabase password security](https://supabase.com/docs/guides/auth/password-security).

An explicit sign-out always clears both device cookies and cloud memory, including during a provider outage. The gateway attempts upstream revocation and blocks replay in the running process, but cannot guarantee provider-side revocation while that provider is unreachable. The guest sign-in panel reports this distinction. Rotating the app encryption key invalidates captured app cookies across restarts; administrators can remove the Auth session or approval to revoke database access independently. This limitation is separate from the always-cleared local device state.


## Final live verification, 2026-10-17

The real approved user confirmed receipt of the Supabase email, completed sign-in and refreshed the signed-in StudyCade page. They reported that the private cloud workspace and Welcome deck remained. Independent read-only database checks confirmed an active Auth session and one persisted workspace at revision 1. Only revision, collection counts and serialized size were inspected; no private note text, approval digest, email, token or owner identifier was added to this report.

The controlled verification tabs continued to show independent guest state, and previous real HTTP probes denied unauthenticated reads and saves through both Render and the Supabase Data API. This establishes a real authenticated initial save and user-confirmed reload. It does not claim a physical laptop-to-desktop test, a real two-user penetration test, production backup restoration, or provider-outage testing beyond the automated regression suite. Sign into the same approved email independently on each device to use the shared cloud workspace. Browser-local guest material remains separate until explicitly copied.

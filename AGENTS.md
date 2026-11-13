# StudyCade agent guidance

This file applies to the `optimization-and-updates` working branch. It does not authorize changes to the production deployment or `main`.

## Source of truth
- Application: React 19 / Vite frontend, FastAPI backend, browser IndexedDB for guest work, Supabase through the server-side cloud gateway for approved accounts.
- Architecture and release boundaries: `docs/ARCHITECTURE.md`, `docs/DEVELOPMENT.md`, `docs/DEPLOYMENT.md`, `SECURITY.md`.
- `main` is source, not the live Render deployment branch. Do not modify `render-guest-security` or promote a release without explicit instruction.

## Skills and ordering
- Before structural questions or refactoring, use `.agents/skills/graphify/SKILL.md` and the generated `graphify-out/graph.json` when present.
- For behavior-preserving simplification read `.agents/skills/code-simplification/SKILL.md`.
- For quality gates and adversarial review read `.agents/skills/code-review-and-quality/SKILL.md`.
- Load only relevant files, not the entire repository, following `.agents/skills/context-engineering/SKILL.md`.

## Allowed changes
- Work only on `optimization-and-updates` unless the user explicitly changes branches.
- Do not push, merge, or force-push `main`. No production deployment.
- Do not remove backend authorization or validation because equivalent frontend logic appears to exist.
- Do not merge guest/cloud storage error handlers, queues, or cloning behavior without explicit equivalence tests.
- Respect imported study material exactly; no unrequested rewriting or AI content synthesis.
- Never commit credentials, account approvals, saved sessions, private coursework, backups, or personal identifiers.

## Verification
- `cd frontend && corepack pnpm install --frozen-lockfile && corepack pnpm test && corepack pnpm build`
- Review backend/deployment manual checks in `docs/DEVELOPMENT.md` when the task touches those paths.
- Refactor one behavior at a time with characterization tests; if CI is unavailable or fails, report the limitation and do not claim correctness.
- A graph is navigational evidence, not a substitute for reading actual source code and callers.

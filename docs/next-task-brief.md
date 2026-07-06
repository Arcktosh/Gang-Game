# Next Task Brief

## Recommended next pass

**Runtime Validation Execution - Installed Dependency and Database Proof**

This is the highest-value next pass because the repo has feature breadth and static gates, but runtime behavior has not been proven in this environment.

## Required environment

- pnpm available.
- Docker available for local PostgreSQL/Redis via `docker compose up -d`, or externally managed PostgreSQL/Redis.
- PostgreSQL available for the main app database.
- PostgreSQL disposable restore database available for backup/restore proof.
- Redis available for worker/runtime smoke paths.
- If Docker Hub image pulls fail, use the default `.env.example` image values: `public.ecr.aws/docker/library/postgres:16-alpine` and `public.ecr.aws/docker/library/redis:7-alpine`, or override them with a reachable internal registry.
- Environment variables configured from `.env.example` and the runtime-proof docs.

## Command sequence

Start local services first:

```bash
docker compose up -d
docker compose ps
```

Preview first:

```bash
MVP_PROOF_DRY_RUN=true pnpm prove:mvp-runtime
```

Then run the proof:

```bash
MVP_RESTORE_DATABASE_URL=postgres://postgres:postgres@localhost:5432/drugdeal_game_restore pnpm prove:mvp-runtime
```

Run integration proof separately:

```bash
pnpm prove:integration
```

## Expected output of the pass

- A short result note with pass/fail for install, migrations, static validation, typecheck, tests, runtime smoke, backup, restore, and integration proof.
- Fixes for any failures found.
- Updated `docs/current-state.md`, `docs/validation-audit.md`, `docs/remaining-work.md`, and a new section in `docs/feature-history.md`.

## Scope guardrails

- Do not start new gameplay breadth during this pass.
- Do not refactor feature code unless required by proof failures.
- Keep crime/legal gameplay fictional and abstract.
- Prefer small, targeted fixes over broad rewrites.
- If the installed proof has already passed outside this repo snapshot, choose compact checklist slices first; good follow-ups after Feature Pass 73 are player-to-player trade, supply/demand events, richer banking statements, deeper loan balance tuning, or deeper finance analytics.

## Fallback if runtime proof cannot be run

If the environment still lacks pnpm/PostgreSQL/Redis, run the dependency-light checks that are available:

```bash
node scripts/validate-docs.mjs
node scripts/validate-migrations.mjs
node scripts/audit-hardening.mjs
node scripts/audit-route-contracts.mjs
node scripts/validate-mvp-acceptance.mjs
node scripts/validate-runtime-proof.mjs
node scripts/validate-site-quality.mjs
```

Then proceed only with documentation/status cleanup or static-proof fixes.


## Feature Pass 74 documentation consolidation

- Historical implementation notes now live in `docs/feature-history.md` instead of many individual `feature-pass-XX.md` files.
- Use current-state/planning docs for active work and search `docs/feature-history.md` only when historical context is needed.


## Feature Pass 75 banking statements

- Bank statement filters, summaries, and CSV export are now in place. The next best compact economy follow-ups remain player-to-player trade, supply/demand events, finance analytics, or loan balance tuning, but runtime proof remains the recommended P0 pass.

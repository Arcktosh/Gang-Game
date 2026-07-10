# Validation Audit

Last updated: Feature Pass 96.

## Consolidated validation commands

Use the reduced command surface:

```bash
pnpm validate:static
pnpm validate:ci
pnpm validate:docs
pnpm validate:migrations
pnpm smoke:runtime
pnpm prove:mvp-runtime
pnpm prove:integration
```

`pnpm validate:static` now calls the validator files directly instead of exposing a root alias for every check. This keeps package scripts shorter while preserving the full static gate.

## Static validators wired into `pnpm validate:static`

- `scripts/validate-migrations.mjs`
- `scripts/audit-hardening.mjs`
- `scripts/audit-route-contracts.mjs`
- `scripts/validate-mvp-pages.mjs`
- `scripts/validate-playable-actions.mjs`
- `scripts/validate-mvp-gameplay.mjs`
- `scripts/validate-admin-rbac.mjs`
- `scripts/validate-admin-operations-ui.mjs`
- `scripts/validate-job-lifecycle.mjs`
- `scripts/validate-legal-recovery.mjs`
- `scripts/validate-release-readiness.mjs`
- `scripts/validate-integration-tests.mjs`
- `scripts/validate-mvp-acceptance.mjs`
- `scripts/validate-runtime-proof.mjs`
- `scripts/validate-monetization-foundation.mjs`
- `scripts/validate-public-launch.mjs`
- `scripts/validate-site-quality.mjs`
- `scripts/validate-in-progress-closures.mjs`
- `scripts/validate-worker-hardening.mjs`
- `scripts/validate-message-moderation.mjs`
- `scripts/validate-feature-flags.mjs`
- `scripts/validate-operational-anomalies.mjs`
- `scripts/validate-admin-audit-workbench.mjs`
- `scripts/validate-admin-rollback-tooling.mjs`
- `scripts/generate-agent-memory.mjs --check`
- `scripts/validate-docs.mjs`
- `scripts/validate-ci-workflow.mjs`

Historical aliases such as `validate:runtime-proof`, `validate:mvp-acceptance`, `validate:integration-tests`, `validate:monetization`, `validate:public-launch`, and `validate:site-quality` were intentionally consolidated into `pnpm validate:static`; their validator files remain present.

## MVP acceptance

MVP acceptance is static-gated by `scripts/validate-mvp-acceptance.mjs` and release-gated by installed runtime proof. The static checks confirm route/page coverage, migration presence, release docs, backup/restore scripts, runtime-proof wiring, monetization placeholders, and public launch references.

## Runtime proof gap

The following still must run in a real installed environment:

```bash
pnpm install
docker compose up -d
pnpm db:setup
pnpm validate:ci
SMOKE_STRICT_HEALTH_OK=true pnpm smoke:runtime
MVP_RESTORE_DATABASE_URL=postgres://postgres:postgres@localhost:5432/drugdeal_game_restore pnpm prove:mvp-runtime
pnpm prove:integration
```

## Site quality and public launch

The site quality validator checks accessibility, responsive design, PWA, SEO, metadata, sitemap, robots, public icons, shared game shell, and action-form accessibility. Public launch checks cover privacy, terms, community rules, onboarding, public launch pages, and beta-test documentation.

## Current pass validation notes

Feature Pass 97 added deterministic agent-memory generation and stale-index/task validation to the static chain. Feature Pass 96 ran dependency-light validation in this sandbox after repairing the Admin Console audit workbench nullable row type mismatch. Feature Pass 95 ran dependency-light validation after repairing audit-route CSV mapper typing and Windows-safe runtime-proof spawning. Feature Pass 94 ran dependency-light validation after admin rollback tooling changes. Feature Pass 93 previously covered admin audit workbench changes. Feature Pass 92 previously covered operational anomaly detection changes. Feature Pass 90 previously covered message moderation/retention, and Feature Pass 89 covered achievement upsert plus worker retry/dead-letter changes. Full dependency-backed workspace typecheck/build/test/runtime proof still requires the local installed environment with PostgreSQL and Redis.


## Feature Pass 93 validation

- Added `scripts/validate-admin-audit-workbench.mjs` and included it in `pnpm validate:static`.
- Verified admin audit workbench route files, DB query helpers, validators, Admin Console wiring, and migration/index references.
- Full dependency-backed typecheck/build/test/runtime proof remains a local environment task.


## Feature Pass 94 validation

- Added `scripts/validate-admin-rollback-tooling.mjs`.
- Included it in `pnpm validate:static`.
- Static validation now checks rollback migrations, DB helpers, `/api/admin/rollback`, and Admin Console wiring.


## Feature Pass 95 validation

- Fixed `apps/web` typecheck failures in admin audit CSV routes by exporting explicit audit row types from `@drugdeal/db` and typing CSV mapper parameters.
- Hardened `scripts/prove-mvp-runtime.mjs` for Windows by using shell resolution on Windows, sanitizing environment values before spawning child processes, hiding spawned windows, and recording synchronous spawn errors in the proof result output.
- Strengthened `scripts/validate-admin-audit-workbench.mjs` and `scripts/validate-runtime-proof.mjs` so the reported regressions are covered by `pnpm validate:static`.
- Sandbox validation covered `node --check scripts/*.mjs`, focused validators, `npm run validate:static --silent`, and `node scripts/prove-mvp-runtime.mjs --dry-run`. Full installed proof still needs to rerun locally.


## Feature Pass 96 validation

- Fixed the follow-up `apps/web` typecheck failure in `src/app/(admin)/admin/page.tsx` by aligning `AdminPanel` audit workbench prop types with the exported nullable audit row types from `@drugdeal/db`.
- Added UI fallbacks for nullable audit descriptions, inventory character names, and session emails.
- Strengthened `scripts/validate-admin-audit-workbench.mjs` so nullable-safe Admin Console audit workbench typing is checked by `pnpm validate:static`.
- Sandbox validation covered `node --check scripts/*.mjs`, focused audit/runtime validators, `node scripts/prove-mvp-runtime.mjs --dry-run`, and `npm run validate:static --silent`. Full installed proof still needs to rerun locally.


## Feature Pass 97 validation

- Added `scripts/generate-agent-memory.mjs` with deterministic generation and `--check` mode.
- Added task id, status, priority, dependency, source-reference, and readiness validation for `.agent-memory/tasks.json`.
- Included the stale-memory check in `pnpm validate:static` before documentation validation.
- Dependency-light validation covers script syntax, generation, stale checking, and documentation/API drift.

# Validation Audit

Last updated: Feature Pass 89.

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

Feature Pass 89 ran dependency-light validation in this sandbox after achievement upsert and worker retry/dead-letter changes. Full dependency-backed workspace typecheck/build/test/runtime proof still requires the local installed environment with PostgreSQL and Redis.

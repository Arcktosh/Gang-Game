# Documentation Retrieval Guide

Use this file as the first read for future tasks. The docs are intentionally compact; `docs/feature-history.md` is the long audit trail and should not be read first unless historical context is needed.

## Read order

| Need | Read first | Then read if needed |
| --- | --- | --- |
| Determine next work | `.agent-memory/tasks.json`, `docs/current-state.md` | `docs/feature-checklist.md`, `docs/backlog-index.md` |
| Implement a route | `docs/api-reference.md` | route file and related validator |
| Change schema/data | `docs/migration-guide.md` | latest SQL migration and DB query file |
| Validate a pass | `docs/validation-audit.md`, `docs/mvp-acceptance.md` | specific `scripts/*.mjs` validator |
| Prepare beta/release | `docs/mvp-release-runbook.md`, `docs/runtime-smoke.md`, `docs/backup-restore.md` | `docs/integration-testing.md`, `docs/observability-runbook.md` |
| Launch/legal content | `docs/privacy-policy.md`, `docs/terms-of-service.md`, `docs/community-rules.md`, `docs/beta-test-plan.md` | public pages |
| Monetization work | `docs/monetization.md` | product/entitlement schema and checkout routes |

## Source-of-truth roles

- `docs/current-state.md` is the compact current-state brief.
- `docs/feature-checklist.md` is the living production-readiness checklist.
- `docs/backlog-index.md` is the compact map of thin or unstarted areas.
- `docs/api-reference.md` and `docs/migration-guide.md` are the API and database inventories.
- `docs/validation-audit.md` lists validation lanes and known proof gaps.
- `docs/feature-history.md` preserves historical implementation notes.

## Retrieval rules

1. AI coding agents should read `AGENTS.md` and `.agent-memory/README.md` before scanning source.
2. Prefer the compact docs above before reading code.
3. Search code only for the feature slice being changed.
4. Update the relevant source-of-truth doc after each pass.
5. Keep package scripts consolidated; add validators under `scripts/*.mjs` and wire them through `pnpm validate:static` instead of adding one-off aliases.

## Validation after documentation changes

```bash
node scripts/validate-docs.mjs
node scripts/validate-migrations.mjs
node scripts/generate-agent-memory.mjs --check
```

After dependencies are installed, run:

```bash
pnpm validate:static
```

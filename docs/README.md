# Documentation Retrieval Guide

Use this file as the first read for future tasks. The docs are split into small source-of-truth files so future passes do not need to scan the full repository or the full historical pass log.

## Read order for future tasks

| Need | Read first | Then read only if needed |
| --- | --- | --- |
| Determine next work | `docs/current-state.md`, `docs/next-task-brief.md` | `docs/backlog-index.md`, `docs/remaining-work.md` |
| Implement a feature | `docs/backlog-index.md`, relevant section in `docs/feature-checklist.md` | relevant `docs/feature-history.md` section |
| Edit API routes | `docs/api-reference.md` | route file, validator/audit script for that route group |
| Edit database schema | `docs/migration-guide.md` | `packages/db/src/schema.ts`, latest migration file |
| Validate a pass | `docs/validation-audit.md`, `docs/mvp-acceptance.md` | specific validation script |
| Prepare beta/release | `docs/mvp-release-runbook.md`, `docs/runtime-smoke.md`, `docs/backup-restore.md` | `docs/integration-testing.md` |
| Site quality or launch content | `docs/site-quality.md`, `docs/privacy-policy.md`, `docs/terms-of-service.md`, `docs/community-rules.md` | `docs/beta-test-plan.md` |
| Monetization work | `docs/monetization.md` | product/entitlement schema and placeholder checkout routes |

## Source-of-truth roles

- `docs/current-state.md` is the compact current-state brief.
- `docs/next-task-brief.md` is the handoff file for the next engineering pass.
- `docs/backlog-index.md` is the compact retrieval map for not-started or thin areas.
- `docs/remaining-work.md` is the prioritized backlog with more detail.
- `docs/feature-checklist.md` is the exhaustive checklist and can be searched by phase.
- `docs/feature-history.md` is the consolidated historical audit trail.

## Retrieval rules

1. Prefer the compact docs above before reading code.
2. Search code only for the feature slice being changed.
3. Use `docs/api-reference.md` as the route inventory instead of walking every route.
4. Use `docs/migration-guide.md` as the schema/migration inventory instead of scanning all SQL first.
5. Treat `docs/feature-history.md` as an audit trail, not current planning.
6. Update `docs/current-state.md`, `docs/next-task-brief.md`, `docs/backlog-index.md`, and the relevant source-of-truth doc after each pass.

## Validation after documentation changes

Run:

```bash
node scripts/validate-docs.mjs
node scripts/validate-migrations.mjs
```

If dependencies are installed, also run:

```bash
pnpm validate:static
```

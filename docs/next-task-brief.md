# Next Task Brief

## Immediate objective

Execute the strengthened production and integration proofs on a staging-capable machine.

1. Run `pnpm doctor:proof`.
2. Run `pnpm prove:mvp-runtime` with PostgreSQL, Redis, Docker Compose, and a disposable restore database.
3. Run `TEST_DATABASE_URL=... pnpm prove:integration`.
4. Attach `artifacts/mvp-runtime-proof.json` and `artifacts/integration-proof.json`.
5. Repair the first failing migration, runtime, worker, backup/restore, or gameplay integration step.
6. Include migrations `0048_item_product_images.sql` and `0049_disable_legacy_dev_owner.sql` in the staging proof.
7. Prove one admin image upload/public cache validation/delete cycle, the legacy-owner neutralizer, and the guarded production owner bootstrap/login/token-revocation path.

## Acceptance

- Both proof artifacts report `passed`.
- No production-critical proof step is skipped.
- The integration proof confirms job application/work/resignation, deterministic crime resolution, persisted player events, and rejected-action rollback.
- Product image persistence, cache validation, market/shop rendering, and character-route gating pass staging smoke checks.
- The historical development owner is unusable after migration `0049`, and production owner bootstrap succeeds only with the documented environment gate, confirmation phrase, and strong operator-supplied secret.

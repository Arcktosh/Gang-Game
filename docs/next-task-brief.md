# Next Task Brief

## Recommended next pass

Use `.agent-memory/tasks.json` as the executable queue. The highest-priority ready task is `VAL-001`: run the installed-environment proof and repair every failure it exposes. This is more valuable than adding feature breadth now.

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:setup
pnpm validate:ci
MVP_RESTORE_DATABASE_URL=postgres://postgres:postgres@localhost:5432/drugdeal_game_restore pnpm prove:mvp-runtime
pnpm prove:integration
```

## Constraints

- Keep gameplay crime/legal systems fictional and abstract.
- Keep root scripts consolidated; new checks should be added as `scripts/*.mjs` and called from `pnpm validate:static`.
- Prefer `pnpm db:apply:all`; use `pnpm db:apply:file -- drizzle/<file>.sql` only for targeted repair.
- Do not mark runtime-proof checklist items complete until they pass in a real installed environment.

## Immediate local verification note

After pulling Feature Pass 96, run `pnpm db:apply:all` before starting the worker so `worker_dead_letters`, message moderation/retention columns, seeded feature-flag config entries, `operational_anomalies`, the audit-workbench indexes, and rollback action/index migrations exist. Then test the Admin Console by running an anomaly scan, opening the economy/inventory/session audit panels, exporting CSV from each, applying and rolling back a test cash/bank admin adjustment once, confirming duplicate rollback is blocked, reviewing/dismissing any generated signal, and confirming feature-flag kill switches still return `feature_disabled` when disabled.


Feature Pass 95 repaired the reported audit-route mapper type errors and Windows runtime-proof spawn failure. Feature Pass 96 repaired the follow-up Admin Console audit workbench nullable row prop mismatch. Next passes should continue from the rerun proof output rather than adding feature breadth blindly; expand rollback coverage only where before/after snapshots can be restored safely and idempotently.


Feature Pass 96 proof repair update: [x] Admin Console audit workbench props now use `AdminEconomyAuditTransaction`, `AdminInventoryAuditItem`, and `AdminSessionAuditSession` from `@drugdeal/db`, with UI fallbacks for nullable descriptions, character names, and emails. Rerun `pnpm typecheck` and `pnpm prove:mvp-runtime` locally after pulling this pass.


## Feature Pass 97 agent workflow update

Future passes should begin with `AGENTS.md` and `.agent-memory/README.md`, update `.agent-memory/tasks.json` as work moves, and run `pnpm agent:memory` whenever file structure, imports, manifests, public exports, routes, pages, or top-level symbols change.

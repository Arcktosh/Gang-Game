# Next Task Brief

## Recommended next pass

Run the installed-environment proof and repair every failure it exposes. This is more valuable than adding feature breadth now.

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

After pulling Feature Pass 89, run `pnpm db:apply:all` before starting the worker so `worker_dead_letters` exists, then reload the dashboard to confirm achievement sync no longer fails on duplicate `character_achievements` inserts.

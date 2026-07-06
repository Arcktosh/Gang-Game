# Integration Testing Guide

Feature Pass 55 adds the database-backed integration-test lane for proving the MVP flows against a real PostgreSQL database instead of only static validators.

## Purpose

Use this lane when you need confidence that core gameplay mutations persist correctly and remain isolated between tests.

The initial suite is intentionally opt-in. It does not run during normal unit tests unless `RUN_DB_INTEGRATION_TESTS=true` is set.

## Required environment

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/drugdeal_game_test
DATABASE_URL=$TEST_DATABASE_URL
RUN_DB_INTEGRATION_TESTS=true
```

`TEST_DATABASE_URL` must point at a disposable database. The integration helpers truncate mutable gameplay tables before each scenario.

## Setup sequence

```bash
pnpm install
docker compose up -d
createdb drugdeal_game_test || true
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:initial
DATABASE_URL=$TEST_DATABASE_URL pnpm db:seed
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:auth
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:progression
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:gameplay
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:risk
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:legal
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:factions
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:shops
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:finance
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:gambling
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:contracts
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:achievements
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:seasons
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:admin
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:pvp
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:equipment
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:vehicles
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:crafting
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:contacts
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:notifications
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:messages
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:newspaper-social
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:shop-ops
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:moderation
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:enforcement
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:enforcement-ops
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:idempotency
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:hardening
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:admin-roles
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:job-lifecycle
RUN_DB_INTEGRATION_TESTS=true TEST_DATABASE_URL=$TEST_DATABASE_URL pnpm test:integration
```

The same path is available as a proof helper:

```bash
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/drugdeal_game_test pnpm prove:integration
```

## Current MVP scenarios

The scaffold covers these required MVP integration scenarios:

1. Register or seed a user.
2. Create a character.
3. Apply for a job.
4. Work a job and verify cash, XP, and employment counters.
5. Resign from the job.
6. Execute a crime scenario and verify outcome persistence.
7. Refresh legal status and verify expired jail/hospital state clears.
8. Verify player events are written for key actions.

## Isolation rules

- Integration tests may truncate disposable runtime tables.
- Integration tests must never run against production.
- `RUN_DB_INTEGRATION_TESTS=true` is required for mutation tests.
- `TEST_DATABASE_URL` is preferred over `DATABASE_URL`.
- Test users and characters should use deterministic `mvp-test-*` identifiers.

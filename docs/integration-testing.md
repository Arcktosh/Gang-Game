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
DATABASE_URL=$TEST_DATABASE_URL pnpm db:apply:all
RUN_DB_INTEGRATION_TESTS=true TEST_DATABASE_URL=$TEST_DATABASE_URL pnpm test:integration
```

`pnpm db:apply:all` records applied SQL files in `schema_migrations`, validates migration checksums, and applies newly added migration scripts automatically in filename order.

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

## Feature Pass 102 expansion

The integration lane now calls the same reusable database services used by the `/api/jobs` and `/api/crimes` routes. The proof deterministically verifies:

- job application persistence;
- completed shift payout, XP, energy, employment counters, action locks, and job-run history;
- resignation persistence;
- successful crime reward, heat, nerve, XP, crime-attempt history, and player events;
- rejection without partial writes when character requirements are not met.

Every run writes machine-readable evidence to `artifacts/integration-proof.json`, including migration and test steps, exit codes, and durations.

# Repository Agent Guide

## Mission

Make bounded, reviewable changes to the DrugDeal Game monorepo while preserving game behavior, database compatibility, security controls, and the fictional/abstract treatment of crime and legal mechanics.

## Start here

1. Read `.agent-memory/README.md`.
2. Select work from `.agent-memory/tasks.json`; do not invent a broad pass when a narrower ready task exists.
3. Read only the relevant sections of `.agent-memory/manifest.md`, `.agent-memory/public-api.md`, `.agent-memory/imports.md`, and `.agent-memory/symbols.md`.
4. Confirm current implementation detail in source before editing. Generated memory is a locator, not a substitute for source.

## Workspace boundaries

- `apps/web`: Next.js App Router UI, server components, route handlers, auth/session integration, and web-only infrastructure.
- `apps/worker`: scheduled ticks, retries, maintenance, and background processing.
- `packages/game`: pure deterministic rules and calculations. Keep database and framework dependencies out.
- `packages/db`: Drizzle schema, migrations, database client, transactional queries, and persistence mappings.
- `packages/validators`: shared input and environment schemas.
- `packages/ui`: framework-compatible shared presentation components.
- `scripts`: repository validation, proof, migration, and maintenance automation.
- `docs`: source-of-truth planning, operational, release, and policy documentation.

## Dependency direction

Prefer `apps/* -> packages/*`. Shared packages may depend on lower-level shared packages only when declared in their manifest. Keep `packages/game` dependency-free. Import workspace packages through `@drugdeal/*` public entrypoints; do not add cross-package deep relative imports.

## Change protocol

- One bounded concern per pass.
- Preserve public exports unless the selected task explicitly allows an API migration.
- Never edit historical migrations to change an applied database; add a new ordered migration.
- Keep route validation, authorization, rate limiting, idempotency, and observability behavior intact.
- Add or update tests for changed behavior and regression fixes.
- Use the narrowest package checks first, then run the task’s listed workspace checks.
- Update `.agent-memory/tasks.json` in the same pass: status, dependencies, source references, acceptance criteria, and concise notes.
- Run `pnpm agent:memory` after structural, import, export, route, manifest, or top-level symbol changes.
- Finish with `pnpm agent:memory:check`; use `pnpm validate:static` when the change affects shared behavior or repository contracts.

## Refactor rules

- Extract by domain or responsibility, not by arbitrary line count.
- Keep orchestration modules thin and explicit.
- Move pure calculations to `packages/game`, persistence to `packages/db`, shared validation to `packages/validators`, and reusable UI to `packages/ui`.
- Avoid introducing generic utility layers that obscure domain names or transaction boundaries.
- For large-file decomposition, first establish characterization tests or confirm existing coverage.

## Safety and product constraints

Gameplay systems involving crime, substances, law enforcement, and finance must remain fictional and abstract. Do not add real-world operational instructions, evasion guidance, or actionable wrongdoing detail. Preserve privacy and security defaults; never place credentials, tokens, personal data, or environment values in agent memory.

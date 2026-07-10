# MVP Acceptance Checklist

This document captures the MVP acceptance status after Feature Pass 93. It is intentionally stricter than the feature checklist: it defines the minimum evidence needed before calling a build an MVP candidate.

## MVP acceptance status

The repository is now a **static MVP candidate**. The core product surface, gameplay loops, admin safety layer, release runbook, backup/restore runbook, and dependency-light validation gates are present in the repo.

Runtime proof still required: the project has not been executed in this sandbox with installed dependencies, a live PostgreSQL database, Redis, Next.js, or the full pnpm toolchain. A release candidate should not be promoted until the runtime commands below pass in a real development environment or CI runner.

## Static MVP acceptance gate

Run the full static gate from a clean checkout:

```bash
pnpm install
pnpm validate:static
```

The consolidated `pnpm validate:static` gate now includes:

- migration continuity and migration apply-script coverage
- API hardening, Redis-backed rate-limit wiring, same-origin, and observability coverage
- representative route-contract coverage
- dedicated MVP page coverage
- MVP progression wiring
- admin RBAC and capability drift validation
- job lifecycle validation
- legal/hospital recovery validation
- release-readiness validation
- MVP acceptance validation through `scripts/validate-mvp-acceptance.mjs`
- documentation drift validation
- CI workflow validation

The dependency-light form of the MVP acceptance validator can also be run directly:

```bash
node scripts/validate-mvp-acceptance.mjs
```

## Runtime proof still required

Run these commands in a real environment with pnpm, PostgreSQL, Redis, and dependencies installed:

```bash
pnpm validate:static
pnpm typecheck
pnpm test
SMOKE_STRICT_HEALTH_OK=true pnpm smoke:runtime
```

The smoke command must run against a started web app with all migrations applied. Use `docs/migration-guide.md` for the canonical migration order.

## MVP product acceptance criteria

The MVP is acceptable for controlled testing when all of these are true:

- Users can register, log in, create a character, and access the authenticated game shell.
- A player can use the primary pages: profile, jobs, crimes, legal, market, shops, messages, newspaper, factions, and dashboard.
- Jobs support application, work, promotion, resignation, wages, XP, rank, shift count, and event logging.
- Crimes consume nerve, award XP/rewards on success, and apply fictional jail/hospital/fine consequences on failure.
- Legal and hospital timers clear through character refresh and can be reduced through supported recovery actions.
- Profile shows resources, status, XP progress, reward tier, and recent event history.
- Market, shops, messages, newspaper, factions, and admin have at least first-pass route/page coverage.
- Admin access uses explicit roles/capabilities instead of broad `isAdmin` checks.
- Unsafe routes are rate-limited, high-risk mutation surfaces have feature-flag kill switches, and all API routes have request observability.
- Release, runtime smoke, backup, and restore procedures are documented.
- The static MVP acceptance gate passes.

## Controlled MVP testing scope

This MVP is suitable for controlled testing of the end-to-end game loop, not for broad public beta. The first external test group should focus on:

- registration and character creation
- dashboard/profile clarity
- job loop clarity
- crime consequence clarity
- legal/hospital recovery clarity
- market/shop affordances
- messaging/newspaper discoverability
- admin moderation and audit workflow
- runtime errors, slow endpoints, and failed state transitions

## Known post-MVP work

The following remain intentionally post-MVP or public-beta hardening items:

- - database-backed integration tests for every major mutation route
- External abuse analytics, bot detection, and load testing
- production SSE fan-out
- external log shipping and error reporting
- deeper abuse analytics and bot detection
- full admin moderation archive and economy/inventory/session audit pages
- richer shops, messages, newspaper, profile, faction, and economy depth
- public deployment automation and load testing


## Runtime proof command

Feature Pass 54 adds the canonical installed-environment runtime proof command:

```bash
MVP_RESTORE_DATABASE_URL=postgres://postgres:postgres@localhost:5432/drugdeal_game_restore pnpm prove:mvp-runtime
```

The command must be run before public MVP testing. It is expected to install dependencies, start Docker services, apply all migrations and seed content, run `pnpm validate:static`, `pnpm typecheck`, and `pnpm test`, launch the web app, run strict smoke checks, create a database backup, and optionally restore that backup into a disposable database.

Use this dry run to review the command sequence without touching local services:

```bash
MVP_PROOF_DRY_RUN=true pnpm prove:mvp-runtime
```

## Public launch polish

Feature Pass 59 adds public launch polish for privacy, terms, community rules, and beta test plan coverage. The public pages `/privacy`, `/terms`, `/rules`, and `/onboarding` are now statically validated, but the legal documents remain draft operational baselines until production legal review is complete.


## Site-quality acceptance addendum

Feature Pass 60 adds the static site-quality gate. MVP acceptance now also requires:

- Site-quality validation passing through `pnpm validate:static`.
- Public metadata, sitemap, robots, PWA manifest, and icon assets present.
- Skip-link and focus-visible support present.
- Responsive game navigation and grid behavior present.
- Manual Lighthouse and keyboard checks completed before public beta.


## Feature Pass 93 audit evidence

- [x] Admin audit workbench endpoints exist for economy transactions, inventory stacks, and sessions.
- [x] Each workbench endpoint supports JSON retrieval and CSV export for support/escalation evidence.
- [ ] Installed-environment proof must still validate the new `0045_admin_audit_workbench.sql` indexes and Admin Console filtering against a seeded PostgreSQL database.

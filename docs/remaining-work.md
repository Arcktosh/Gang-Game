# Remaining Work

Runtime proof still required. Feature Pass 56 established the MVP acceptance gate; Feature Pass 59 added public launch polish and left Production legal review as a commercial-launch blocker; Feature Pass 60 left manual Lighthouse and assistive-technology verification as real-browser work.

## Highest priority

1. Run `pnpm prove:mvp-runtime` with dependencies installed, PostgreSQL running, and Redis running.
2. Run `pnpm prove:integration` against a disposable `TEST_DATABASE_URL`.
3. Fix any migration, build, typecheck, test, smoke, backup, or restore failures found during proof.
4. Deploy the configured observability sinks, verify alert ownership/dashboards, then add abuse analytics, bot detection, and load testing.

## Feature-depth backlog

- Public profile routes, tutorial/wiki, skill trees, season leaderboards/rewards, daily login streaks, referral/mentor systems.
- Auction house, player-hosted gambling tables, faction diplomacy, territory upgrades/taxes, formal war UI, multi-step contracts.
- Deeper economy controls: inflation/passive-income controls and balance editor wired into formulas/ticks. First-pass anomaly detection exists but needs installed-environment proof and deeper abuse analytics.
- Admin archives, broader rollback coverage beyond cash/bank adjustments, deeper abuse analytics, bot detection, and load testing. Feature flags and message hide/retention now have first-pass production hardening, but still need installed-environment proof.

## Closed in-progress markers kept for validation

Feature Pass 61 in-progress task update: [x] Full Messages page with live stream status, read/mute/leave/report/block controls, and responsive message actions.

Feature Pass 90 moderation update: [x] Admins can hide reported messages from player inboxes, and maintenance cleanup can delete expired messages after `MESSAGE_RETENTION_DAYS` while preserving open-report evidence.

Feature Pass 91 operations update: [x] Admins can toggle feature flags for high-risk mutation surfaces. Installed-environment proof still needs to disable and re-enable at least one flag and verify `feature_disabled` API responses.


Feature Pass 92 anomaly update: [x] Worker/admin operational anomaly scans now flag high net worth, transaction spikes, oversized inventory stacks, and recent session IP spread. Installed-environment proof still needs to run the migration, worker tick, manual admin scan, and review/dismiss/resolve flow.


Feature Pass 93 audit update: [x] Economy, inventory, and session/IP audit workbench panels and CSV export routes are wired. Installed-environment proof still needs to apply `0045_admin_audit_workbench.sql`, verify query latency on realistic data, and confirm CSV downloads through the Admin Console.


Feature Pass 94 rollback update: [x] Admins can roll back recent cash/bank admin adjustments from the audit trail. Installed-environment proof still needs to apply `0046_admin_rollback_action_types.sql` and `0047_admin_rollback_tooling.sql`, apply a test adjustment, roll it back once, and confirm duplicate rollback is blocked.


Feature Pass 95 proof repair update: [x] Admin audit CSV routes now type their mapper rows explicitly, and `scripts/prove-mvp-runtime.mjs` uses Windows-safe shell spawning plus sanitized environment values to avoid the reported `spawn EINVAL` failure.

Feature Pass 96 proof repair update: [x] Admin Console audit workbench state/prop types now use the exported nullable audit row types and render safe fallbacks for missing descriptions, character names, and emails. Rerun `pnpm typecheck` and `pnpm prove:mvp-runtime` locally after pulling this pass.


Feature Pass 97 agent-memory update: [x] Added deterministic file/import/manifest/public-API/symbol indexes, a validated JSON task queue, and a stale-memory gate in `pnpm validate:static`.

Feature Pass 98 testing update: [x] Placeholder worker, database, and UI test commands were replaced with executable deterministic baselines. Installed-environment execution is still required before `TST-001` can be closed.

## Feature Pass 99 follow-up

Run `pnpm doctor:proof` first in the installed development or staging environment. Repair every failed prerequisite, including generating and committing `pnpm-lock.yaml` with pnpm 9.15.4, installing Docker Compose v2 and PostgreSQL client tools, and configuring `MVP_RESTORE_DATABASE_URL` to a disposable database. Then rerun `pnpm prove:mvp-runtime` without `--skip-preflight`.


## Feature Pass 100 follow-up

The shared observability foundation, API/worker telemetry, redaction, HTTP shipping hooks, runbook, tests, and committed pnpm lockfile are complete. Remaining observability work is operational: configure real event/alert endpoints, verify redaction against production-shaped payloads, create dashboards, test alert routing, and run incident/rollback exercises. `VAL-001` still requires Docker/PostgreSQL-backed migrations, live runtime smoke, backup, and restore proof.

## Feature Pass 101 follow-up

The proof runner itself is now production-complete. Execute it on a machine with Docker Compose, PostgreSQL client tools, Redis, and pnpm 9.15.4. Do not close `VAL-001` until `artifacts/mvp-runtime-proof.json` reports success with no skipped production-critical steps.

## Feature Pass 102 follow-up

The job and crime API routes now share reusable transactional services with the database integration suite. Run `TEST_DATABASE_URL=... pnpm prove:integration` against a disposable migrated PostgreSQL database and retain `artifacts/integration-proof.json`. `VAL-002` remains blocked until that live proof passes after `VAL-001`.

## Feature Pass 103 follow-up

Apply `0048_item_product_images.sql` in staging, upload JPEG/PNG/WebP samples through the Admin Console, verify ETag/304 delivery and deletion, and exercise market/shop cards at mobile and desktop breakpoints with keyboard and assistive technology. Retain the installed typecheck/test/build and PostgreSQL evidence with `VAL-001`/`VAL-002`; the source implementation is complete, but those infrastructure-backed proofs remain open.

## Feature Pass 104 follow-up

Apply `0049_disable_legacy_dev_owner.sql` in a disposable staging copy and verify that the fixed-id and legacy-email owner paths have no active sessions, one-time tokens, verified email, usable password, or administrator role. Exercise the guarded local development seed only against a development database, then exercise production owner creation and an explicitly authorized reset against a separate production-like database. Retain evidence that each command rejects the wrong `NODE_ENV`, missing enable flags, weak passwords, absent confirmation, and unintended existing-account resets. Do not close `VAL-001` until login and token revocation are proven after the transaction commits.

## Feature Pass 105 follow-up

Run the installed web typecheck and production build, then exercise all 17 promoted dashboard/profile/inventory routes from the categorized sidebar. Verify one current-page indicator at a time, direct URL entry, browser back/forward behavior, keyboard-only expansion/collapse, screen-reader names and states, mobile sidebar scrolling, and event-stream connections limited to the activity and message overview routes. Retain this evidence with `VAL-001`; the source implementation and dependency-light route contracts are complete.

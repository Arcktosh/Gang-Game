# Remaining Work

Runtime proof still required. Feature Pass 56 established the MVP acceptance gate; Feature Pass 59 added public launch polish and left Production legal review as a commercial-launch blocker; Feature Pass 60 left manual Lighthouse and assistive-technology verification as real-browser work.

## Highest priority

1. Run `pnpm prove:mvp-runtime` with dependencies installed, PostgreSQL running, and Redis running.
2. Run `pnpm prove:integration` against a disposable `TEST_DATABASE_URL`.
3. Fix any migration, build, typecheck, test, smoke, backup, or restore failures found during proof.
4. Add external log shipping, alerting, abuse analytics, bot detection, and load testing.

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

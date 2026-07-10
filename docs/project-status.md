# Project Status

Last updated: Feature Pass 97.

The project is an **MVP candidate**. Feature Pass 56 added monetization placeholders and MVP acceptance checks; Feature Pass 59 added public launch polish; Feature Pass 60 added accessibility, responsive design, PWA, and SEO foundations; Feature Pass 88 reduced package-script and documentation sprawl while adding Redis-backed rate limiting; Feature Pass 89 hardened achievement sync idempotency and worker retry/dead-letter handling; Feature Pass 90 adds admin message hiding plus configurable message-retention cleanup; Feature Pass 91 adds operational feature flags for high-risk mutation routes; Feature Pass 92 adds automated operational anomaly detection for economy, inventory, and session-risk signals; Feature Pass 93 adds the admin audit workbench for filtered economy, inventory, and session investigations with CSV exports; Feature Pass 94 adds first-pass admin rollback tooling for cash/bank adjustment mistakes; Feature Pass 95 fixes audit-route mapper typing and hardens `prove:mvp-runtime` for Windows process spawning; Feature Pass 96 fixes the follow-up Admin Console audit workbench nullable row typing issue; Feature Pass 97 adds deterministic AI-agent retrieval indexes, a machine-readable task queue, and normalized shared-package public barrels.

## Ready for controlled MVP evaluation

- Auth, account recovery, character creation, profile, and session handling.
- Core playable loops: jobs, crimes, travel, legal/hospital recovery, market, banking, loans, training, education, shops, messages, newspaper, factions, PvP, contracts, and admin operations. High-risk mutation surfaces now have admin feature-flag kill switches, economy-impacting admin adjustments have first-pass rollback controls, and audit CSV routes and Admin Console audit workbench props now carry explicit nullable row types.
- Static validation, migration checks, runtime proof orchestrator wiring, and stale agent-memory validation.
- Public launch pages and draft policies.

## Not production-ready until proven

- Full installed-environment proof through `pnpm prove:mvp-runtime`; the reported Windows spawn failure and follow-up Admin Console audit prop type mismatch are repaired, but the full proof still needs to be rerun locally.
- Database-backed integration proof through `pnpm prove:integration`.
- Real external observability/alerts, abuse prevention, bot detection, load testing, and final legal/payment review.

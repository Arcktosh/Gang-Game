# Public Beta Test Plan

Current as of Feature Pass 59.

This plan turns the static MVP candidate into a controlled public beta candidate.

## Entry criteria

Do not invite public testers until all of the following pass in a real environment:

```bash
pnpm prove:mvp-runtime
TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/drugdeal_game_test pnpm prove:integration
```

The operator must also complete one successful backup and one successful restore drill.

## Test cohorts

Use staged cohorts:

1. internal operator accounts;
2. trusted closed-alpha testers;
3. small invite-only beta group;
4. broader beta after stability and moderation review.

## First-session script

Ask each tester to complete:

1. register;
2. create/select a character;
3. review `/onboarding`;
4. open `/profile`;
5. apply for a job and work one shift;
6. attempt a low-risk crime;
7. recover through `/legal` when needed;
8. buy or sell one market item;
9. send a test message;
10. review rules and report one intentionally seeded test issue if available.

## Exit criteria

A beta cohort is successful when:

- runtime proof remains green;
- no unhandled critical errors persist;
- backup/restore proof remains current;
- admin audit logs show expected operator actions;
- moderators can resolve reports and appeals from the browser;
- new users can complete the first-session script without API knowledge;
- economy anomalies are known, documented, or patched.

## Known MVP limitations

- Runtime proof must still be executed outside the sandbox.
- Integration tests are scaffolded but require a disposable PostgreSQL database.
- Monetization checkout is intentionally disabled.
- Production legal documents require review.
- Distributed rate limiting and production log shipping remain post-MVP hardening items.

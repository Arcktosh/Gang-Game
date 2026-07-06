# Monetization Foundation

Feature Pass 56 adds a payment-provider-safe monetization foundation without enabling live purchases by default.

## MVP policy

The MVP monetization model must stay fair:

- cosmetics are allowed
- season-pass cosmetics are allowed
- VIP convenience is allowed only when it does not grant gameplay power
- direct cash, success-rate boosts, combat power, territory advantages, and admin-like capabilities are not allowed

## Catalog

Seeded products live in `product_catalog`:

- `founder_badge`
- `founder_frame`
- `season_pass_s1`
- `vip_monthly`

## Entitlements

Purchased or granted benefits live in `user_entitlements`. Character-facing cosmetics live in `character_cosmetics`.

The initial tables support founder cosmetics, season-pass ownership, VIP membership, admin grants, revocation, expiry, and equipped cosmetic slots.

## API surface

- `GET /api/monetization/catalog` returns active products.
- `GET /api/monetization/entitlements` returns the signed-in user's active entitlements.
- `POST /api/monetization/checkout` creates a checkout intent placeholder.

Live checkout is disabled unless a future provider adapter is fully implemented. `STRIPE_SECRET_KEY` is intentionally optional so the MVP can run without payment credentials.

## Launch sequence

1. Apply `0031_monetization_foundation.sql`.
2. Verify the seeded product catalog.
3. Keep checkout disabled for private MVP tests.
4. Add a real hosted-checkout adapter only after terms, privacy, refund, and support workflows are complete.
5. Use admin grants for founder/beta cosmetics during early testing.

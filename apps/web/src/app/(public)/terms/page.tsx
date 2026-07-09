import Link from 'next/link';

export default function TermsPage() {
  return (
    <main className="site-page site-page--narrow" aria-labelledby="terms-title">
      <section className="site-panel">
        <p className="eyebrow">Public beta policy</p>
        <h1 id="terms-title">Terms of Service</h1>
        <p className="lead">
          DrugDeal Game is a fictional browser MMO prototype for public beta testing. Gameplay
          content is fictional and must not be treated as real-world instruction, endorsement, or
          advice.
        </p>
        <div className="grid">
          <section className="card">
            <h2>Beta access</h2>
            <p>
              Access may be limited, reset, suspended, or revoked while the project is tested,
              balanced, secured, and prepared for production launch.
            </p>
          </section>
          <section className="card">
            <h2>Fair play</h2>
            <p>
              Automation, exploit abuse, harassment, evasion, payment fraud, data scraping, or
              attempts to bypass rate limits, idempotency, security, or admin controls are not
              allowed.
            </p>
          </section>
          <section className="card">
            <h2>Virtual items</h2>
            <p>
              Virtual currency, cosmetics, entitlements, rankings, and season progress are game
              records only. They may be corrected or reset during beta balancing and incident
              response.
            </p>
          </section>
          <section className="card">
            <h2>Operator actions</h2>
            <p>
              Authorized operators may investigate reports, moderate content, adjust balances, lift
              or apply enforcement, and preserve audit logs to keep the beta safe and playable.
            </p>
          </section>
        </div>
        <p className="link-list">
          <Link className="button-link" href="/privacy">
            Privacy
          </Link>
          <Link className="button-link" href="/rules">
            Community rules
          </Link>
          <Link className="button-link" href="/onboarding">
            Onboarding
          </Link>
        </p>
      </section>
    </main>
  );
}

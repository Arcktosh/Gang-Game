import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <main className="site-page site-page--narrow" aria-labelledby="privacy-title">
      <section className="site-panel">
        <p className="eyebrow">Public beta policy</p>
        <h1 id="privacy-title">Privacy Policy</h1>
        <p className="lead">
          DrugDeal Game is a fictional text-based strategy game. This MVP privacy notice explains the minimum data categories the app expects to process during
          public beta testing.
        </p>
        <div className="grid">
          <section className="card">
            <h2>Data collected</h2>
            <p>Account identifiers, login/session state, character progress, gameplay actions, messages, moderation reports, admin audit records, and operational telemetry may be stored to operate and secure the game.</p>
          </section>
          <section className="card">
            <h2>Why it is used</h2>
            <p>Data is used for authentication, persistent gameplay, abuse prevention, moderation, support, backups, release validation, and aggregate balancing analysis.</p>
          </section>
          <section className="card">
            <h2>Payments and monetization</h2>
            <p>Live payment processing is intentionally disabled in the MVP codebase. Entitlements and cosmetics may be granted by administrators for testing until a production payment provider is reviewed and connected.</p>
          </section>
          <section className="card">
            <h2>Safety and moderation</h2>
            <p>Messages, reports, sanctions, appeals, and admin actions may be reviewed by authorized operators to enforce the community rules and protect the beta environment.</p>
          </section>
        </div>
        <p className="link-list">
          <Link className="button-link" href="/terms">Terms</Link>
          <Link className="button-link" href="/rules">Community rules</Link>
          <Link className="button-link" href="/onboarding">Onboarding</Link>
        </p>
      </section>
    </main>
  );
}

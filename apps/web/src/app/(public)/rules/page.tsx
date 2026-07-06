import Link from 'next/link';

const rules = [
  'Keep gameplay fictional and do not encourage real-world crime, harm, or harassment.',
  'Do not threaten, dox, impersonate, stalk, or target other players.',
  'Do not exploit bugs, automate actions, evade rate limits, or operate bot accounts.',
  'Do not trade accounts, sell access, or attempt payment or entitlement fraud.',
  'Report abuse, economy exploits, unsafe messages, and moderation mistakes through the in-game reporting and appeal tools.',
];

export default function RulesPage() {
  return (
    <main className="site-page site-page--narrow" aria-labelledby="rules-title">
      <section className="site-panel">
        <p className="eyebrow">Public beta policy</p>
        <h1 id="rules-title">Community Rules</h1>
        <p className="lead">These rules define the minimum conduct baseline for public MVP testing.</p>
        <ol className="site-feature-list">
          {rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>
        <section>
          <h2>Moderation workflow</h2>
          <p>Reports, appeals, sanctions, and admin actions are tracked through the moderation and audit systems so operator decisions remain reviewable.</p>
        </section>
        <p className="link-list">
          <Link className="button-link" href="/privacy">Privacy</Link>
          <Link className="button-link" href="/terms">Terms</Link>
          <Link className="button-link" href="/onboarding">Onboarding</Link>
        </p>
      </section>
    </main>
  );
}

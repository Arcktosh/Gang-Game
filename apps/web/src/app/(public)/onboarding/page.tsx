import Link from 'next/link';

const checklist = [
  'Create an account and sign in.',
  'Create or select your first character from the dashboard.',
  'Open Profile to review cash, energy, nerve, health, heat, XP, and event history.',
  'Apply for a starter job, then work shifts for safe income and XP.',
  'Attempt low-risk crimes only after checking nerve, heat, and legal status.',
  'Use Legal after jail, heat, or hospital events to recover safely.',
  'Try Market and Shops for basic economy actions.',
  'Read Messages, Newspaper, and Factions to test social and community loops.',
  'Report bugs, unsafe behavior, balance issues, and confusing UI during beta testing.',
];

export default function OnboardingPage() {
  return (
    <main className="site-page site-page--narrow" aria-labelledby="onboarding-title">
      <section className="site-panel">
        <p className="eyebrow">MVP onboarding</p>
        <h1 id="onboarding-title">First Session Checklist</h1>
        <p className="lead">A safe path through the current MVP gameplay loop for new beta testers.</p>
        <ol className="site-feature-list">
          {checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
        <section>
          <h2>Recommended first loop</h2>
          <p>
            Start with a job, review your profile progression, then try one low-risk action and recover through Legal if needed. Avoid high-risk actions until
            the runtime proof and balancing passes are complete.
          </p>
        </section>
        <p className="link-list">
          <Link className="button-link button-link--primary" href="/register">Create account</Link>
          <Link className="button-link" href="/login">Login</Link>
          <Link className="button-link" href="/rules">Community rules</Link>
        </p>
      </section>
    </main>
  );
}

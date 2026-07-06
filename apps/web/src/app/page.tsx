import Link from 'next/link';

const features = [
  ['Persistent economy', 'Jobs, markets, shops, finance, contracts, and inventory systems stay connected across sessions.'],
  ['Strategic character growth', 'Train stats, study courses, earn achievements, claim objectives, and build prestige over seasons.'],
  ['Social world systems', 'Faction territory, messaging, newspaper posts, PvP, bounties, and moderation tools are ready for live play.'],
] as const;

export default function HomePage() {
  return (
    <main className="site-page" aria-labelledby="home-title">
      <section className="site-hero">
        <div className="site-hero__grid">
          <div className="site-hero__copy">
            <p className="eyebrow">Persistent browser MMO</p>
            <h1 className="site-hero__title" id="home-title">DrugDeal Game</h1>
            <p className="lead">
              A modern text-based multiplayer game shell with character progression, crews, markets, travel, messaging, moderation, seasons, and live economy
              loops.
            </p>
            <nav className="link-list" aria-label="Primary site links">
              <Link className="button-link button-link--primary" href="/register">
                Create account
              </Link>
              <Link className="button-link" href="/login">
                Login
              </Link>
              <Link className="button-link" href="/dashboard">
                Dashboard
              </Link>
              <Link className="button-link" href="/onboarding">
                Onboarding
              </Link>
              <Link className="button-link" href="/rules">
                Rules
              </Link>
            </nav>
            <div className="site-hero__metrics" aria-label="Game systems summary">
              <div className="site-metric"><strong>10+</strong><span>major systems</span></div>
              <div className="site-metric"><strong>Live</strong><span>economy-ready systems</span></div>
              <div className="site-metric"><strong>Seasonal</strong><span>progression loops</span></div>
            </div>
          </div>
          <aside className="site-panel" aria-label="Platform highlights">
            <p className="eyebrow">MVP platform</p>
            <h2>Designed for fast play, readable data, and scalable content passes.</h2>
            <ul className="site-feature-list">
              {features.map(([title, body]) => (
                <li key={title}>
                  <strong>{title}</strong>
                  <span>{body}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>
      <footer className="site-footer" aria-label="Public policy links">
        <Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> · <Link href="/rules">Community rules</Link>
      </footer>
    </main>
  );
}

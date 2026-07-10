import {
  getCharacterProgressionProfile,
  getCharacterStatusDetail,
  listCharacterEvents,
} from '@drugdeal/db';
import { calculateProgressionFromExperience } from '@drugdeal/game';
import { notFound } from 'next/navigation';
import { GameActionForm } from '@/features/game/action-form';
import { FocusedSections } from '@/features/game/focused-sections';
import {
  Card,
  EmptyState,
  formatDate,
  GamePageShell,
  getActiveGameContext,
  Grid,
  money,
  StatList,
} from '@/features/game/game-page';

const profileSectionItems = [
  { label: 'Overview', href: '/profile#profile-overview', icon: '▣' },
  { label: 'Status', href: '/profile#profile-status', icon: '⚖' },
  { label: 'Titles', href: '/profile#profile-titles', icon: '◉' },
  { label: 'Rewards', href: '/profile#profile-rewards', icon: '◇' },
  { label: 'Achievements', href: '/profile#profile-achievements', icon: '▤' },
  { label: 'History', href: '/profile#profile-history', icon: '◫' },
] as const;

const focusedProfileSections = profileSectionItems.map((section) => ({
  id: section.href.split('#')[1] ?? section.href,
  label: section.label,
}));

export default async function ProfilePage() {
  const { session, character } = await getActiveGameContext();
  const [eventRows, status, progression] = await Promise.all([
    listCharacterEvents(character.id, session.user.id, 30),
    getCharacterStatusDetail(character.id),
    getCharacterProgressionProfile({ userId: session.user.id, characterId: character.id }),
  ]);

  if (!progression) {
    notFound();
  }

  const events = eventRows ?? [];
  const xpProgress = calculateProgressionFromExperience(character.experience);
  const claimableAchievements = progression.achievements
    .filter((entry) => entry.progress.isCompleted && !entry.progress.claimedAt)
    .slice(0, 6);
  const claimableObjectives = progression.objectives
    .filter((entry) => entry.objective.status === 'completed' && !entry.objective.claimedAt)
    .slice(0, 6);
  const recentAchievements = progression.achievements.slice(0, 8);
  const activeTitles = progression.titles.slice(0, 8);
  const publicEvents = events.filter((event) => event.visibility === 'public');
  const privateEvents = events.filter((event) => event.visibility !== 'public');

  return (
    <GamePageShell
      sidebarCharacter={character}
      sectionItems={profileSectionItems}
      title={`${character.name} profile`}
      eyebrow="Character"
      description="Review resources, progression, public profile signals, privacy boundaries, rewards, titles, and recent activity history."
    >
      <FocusedSections sections={focusedProfileSections} label="profile section">
        <section id="profile-overview" className="dashboard-section">
          <Grid>
            <Card title="Resources">
              <div className="progress-grid">
                <ProfileProgressMeter label="Health" value={character.health} max={100} />
                <ProfileProgressMeter
                  label="Energy"
                  value={character.energy}
                  max={character.maxEnergy}
                />
                <ProfileProgressMeter label="Nerve" value={character.nerve} max={character.maxNerve} />
                <ProfileProgressMeter label="Heat" value={character.heat} max={100} />
              </div>
              <StatList
                items={[
                  { label: 'Status', value: character.status },
                  { label: 'Location', value: character.location },
                  { label: 'Cash', value: money(character.cash) },
                  { label: 'Bank', value: money(character.bank) },
                  { label: 'Health', value: `${character.health}/100` },
                  { label: 'Energy', value: `${character.energy}/${character.maxEnergy}` },
                  { label: 'Nerve', value: `${character.nerve}/${character.maxNerve}` },
                  { label: 'Heat', value: character.heat },
                ]}
              />
            </Card>
            <Card title="Progression">
              <div className="progress-grid">
                <ProfileProgressMeter
                  label="Level progress"
                  value={xpProgress.experienceIntoLevel}
                  max={xpProgress.experienceForNextLevel}
                  meta={`${xpProgress.progressPercent}%`}
                />
                <ProfileProgressMeter
                  label="Achievements"
                  value={progression.summary.completedAchievements}
                  max={progression.summary.totalAchievements}
                />
              </div>
              <StatList
                items={[
                  { label: 'Level', value: character.level },
                  {
                    label: 'XP',
                    value: `${xpProgress.experienceIntoLevel}/${xpProgress.experienceForNextLevel} to next level`,
                  },
                  { label: 'Current reward', value: `${xpProgress.rewards.title} · ${xpProgress.rewards.maxNerve} max nerve` },
                  { label: 'Achievements', value: `${progression.summary.completedAchievements}/${progression.summary.totalAchievements}` },
                  { label: 'Profile score', value: progression.summary.profileScore },
                  { label: 'Claimable', value: progression.summary.claimableAchievements + progression.summary.claimableObjectives },
                  { label: 'Active title', value: progression.activeTitle?.title ?? 'None' },
                ]}
              />
            </Card>
            <Card title="Public profile mode">
              <p style={{ color: '#a1a1aa', marginTop: 0 }}>
                Public profile preview only exposes public activity, active title, level,
                reputation, and profile score. Private cash, bank, health, legal holds, and
                admin-only events stay out of the public summary.
              </p>
              <StatList
                items={[
                  { label: 'Public events shown', value: publicEvents.length },
                  { label: 'Private/admin events hidden', value: privateEvents.length },
                  { label: 'Public title', value: progression.activeTitle?.title ?? 'None selected' },
                  { label: 'Public score', value: progression.summary.profileScore },
                ]}
              />
            </Card>
          </Grid>
        </section>

        <section id="profile-status" className="dashboard-section">
          <Grid>
            <Card title="Legal and medical status">
              <StatList
                items={[
                  { label: 'Blocked until', value: formatDate(status?.blockedUntil) },
                  { label: 'Reason', value: status?.reason ?? 'Clear' },
                  { label: 'Hospital release', value: formatDate(status?.hospitalStay?.releasedAt) },
                  { label: 'Jail release', value: formatDate(status?.jailSentence?.releaseAt) },
                ]}
              />
            </Card>
            <Card title="Public privacy boundary">
              <p style={{ color: '#a1a1aa', marginTop: 0 }}>
                This view keeps operational resources and enforcement context private while still
                allowing achievements, title, level, and reputation to be shown publicly.
              </p>
              <StatList
                items={[
                  { label: 'Visible public records', value: publicEvents.length },
                  { label: 'Private records held back', value: privateEvents.length },
                  { label: 'Current status', value: character.status },
                  { label: 'Location', value: character.location },
                ]}
              />
            </Card>
          </Grid>
        </section>

        <section id="profile-titles" className="dashboard-section">
          <Grid>
            <Card title="Title controls" meta={`${progression.titles.length} earned`}>
              {activeTitles.length > 0 ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  {activeTitles.map((title) => (
                    <article
                      key={title.titleKey}
                      style={{ borderTop: '1px solid #27272a', paddingTop: 10 }}
                    >
                      <strong>{title.title}</strong>
                      <p style={{ color: '#a1a1aa', margin: '4px 0' }}>
                        {title.isActive ? 'Currently public' : `Earned ${formatDate(title.earnedAt)}`}
                      </p>
                      <GameActionForm
                        endpoint="/api/profile/titles/active"
                        label={title.isActive ? 'Keep active title' : 'Set active title'}
                        payload={{ characterId: character.id, titleKey: title.titleKey }}
                        successMessage="Active title updated."
                        idempotent={false}
                      />
                    </article>
                  ))}
                  <GameActionForm
                    endpoint="/api/profile/titles/active"
                    label="Clear active title"
                    payload={{ characterId: character.id, titleKey: null }}
                    successMessage="Active title cleared."
                    idempotent={false}
                  />
                </div>
              ) : (
                <EmptyState>No titles earned yet.</EmptyState>
              )}
            </Card>
          </Grid>
        </section>

        <section id="profile-rewards" className="dashboard-section">
          <Grid>
            <Card title="Claimable achievement rewards" meta={`${claimableAchievements.length} shown`}>
              {claimableAchievements.length > 0 ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  {claimableAchievements.map((entry) => (
                    <article
                      key={entry.definition.key}
                      style={{ borderTop: '1px solid #27272a', paddingTop: 10 }}
                    >
                      <strong>{entry.definition.title}</strong>
                      <p style={{ color: '#a1a1aa', margin: '4px 0' }}>
                        {entry.definition.description} · {entry.definition.points} points
                      </p>
                      <GameActionForm
                        endpoint={`/api/profile/achievements/${entry.definition.key}/claim`}
                        label="Claim achievement"
                        payload={{ characterId: character.id }}
                        successMessage="Achievement reward claimed."
                      />
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState>No achievement rewards are claimable right now.</EmptyState>
              )}
            </Card>

            <Card title="Claimable objective rewards" meta={`${claimableObjectives.length} shown`}>
              {claimableObjectives.length > 0 ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  {claimableObjectives.map((entry) => (
                    <article
                      key={entry.objective.id}
                      style={{ borderTop: '1px solid #27272a', paddingTop: 10 }}
                    >
                      <strong>{entry.definition.title}</strong>
                      <p style={{ color: '#a1a1aa', margin: '4px 0' }}>
                        {entry.objective.cadence} · ends {formatDate(entry.objective.periodEnd)}
                      </p>
                      <GameActionForm
                        endpoint={`/api/profile/objectives/${entry.objective.id}/claim`}
                        label="Claim objective"
                        payload={{ characterId: character.id }}
                        successMessage="Objective reward claimed."
                      />
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState>No objective rewards are claimable right now.</EmptyState>
              )}
            </Card>
          </Grid>
        </section>

        <section id="profile-achievements" className="dashboard-section">
          <Grid>
            <Card title="Recent achievements" meta={`${recentAchievements.length} shown`}>
              {recentAchievements.length > 0 ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  {recentAchievements.map((entry) => (
                    <article
                      key={entry.definition.key}
                      style={{ borderTop: '1px solid #27272a', paddingTop: 10 }}
                    >
                      <strong>{entry.definition.title}</strong>
                      <p style={{ color: '#a1a1aa', margin: '4px 0' }}>
                        {entry.progress.isCompleted
                          ? 'Completed'
                          : `${entry.progress.progress}/${entry.definition.target}`}{' '}
                        · {entry.definition.category}
                      </p>
                      <ProfileProgressMeter
                        label="Achievement progress"
                        value={entry.progress.progress}
                        max={entry.definition.target}
                        meta={
                          entry.progress.isCompleted
                            ? 'Complete'
                            : `${entry.progress.progress}/${entry.definition.target}`
                        }
                      />
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState>No achievements loaded yet.</EmptyState>
              )}
            </Card>
          </Grid>
        </section>

        <section id="profile-history" className="dashboard-section">
          <Grid>
            <Card title="Recent event history" meta={`${events.length} shown`}>
              {events && events.length > 0 ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  {events.map((event) => (
                    <article
                      key={event.id}
                      style={{ borderTop: '1px solid #27272a', paddingTop: 10 }}
                    >
                      <strong>{event.type.replaceAll('_', ' ')}</strong>
                      <p style={{ color: '#a1a1aa', margin: '4px 0 0' }}>
                        {event.visibility} · {formatDate(event.createdAt)}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState>No character events found yet.</EmptyState>
              )}
            </Card>
          </Grid>
        </section>
      </FocusedSections>
    </GamePageShell>
  );
}

function ProfileProgressMeter({
  label,
  value,
  max,
  meta,
}: {
  label: string;
  value: number;
  max: number;
  meta?: string;
}) {
  const safeMax = Math.max(max, 1);
  const safeValue = Math.min(Math.max(value, 0), safeMax);
  const percent = Math.round((safeValue / safeMax) * 100);

  return (
    <div className="progress-meter">
      <div className="progress-meter__header">
        <span>{label}</span>
        <strong>{meta ?? `${safeValue}/${safeMax}`}</strong>
      </div>
      <progress value={safeValue} max={safeMax} aria-label={`${label}: ${meta ?? `${percent}%`}`} />
    </div>
  );
}

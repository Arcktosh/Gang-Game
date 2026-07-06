import { getCharacterStatusDetail, listActiveActionLocks, listLegalServiceLogs } from '@drugdeal/db';
import { GameActionForm } from '@/features/game/action-form';
import { Card, EmptyState, formatDate, GamePageShell, getActionCooldown, getActiveGameContext, Grid, money, StatList } from '@/features/game/game-page';

export default async function LegalPage() {
  const { character } = await getActiveGameContext();
  const [status, logs, actionLocks] = await Promise.all([getCharacterStatusDetail(character.id), listLegalServiceLogs(character.id, 20), listActiveActionLocks(character.id)]);

  return (
    <GamePageShell sidebarCharacter={character} title="Legal and hospital" eyebrow={character.name} description="Track jail, hospital, lawyer, bribe, and recovery state from one MVP status page.">
      <Grid>
        <Card title="Current status">
          <StatList items={[
            { label: 'Character status', value: character.status },
            { label: 'Blocked until', value: formatDate(status?.blockedUntil) },
            { label: 'Reason', value: status?.reason ?? 'Clear' },
            { label: 'Heat', value: character.heat },
            { label: 'Health', value: `${character.health}/100` },
          ]} />
        </Card>
        <Card title="Active penalties">
          <StatList items={[
            { label: 'Jail release', value: formatDate(status?.jailSentence?.releaseAt) },
            { label: 'Fine', value: money(status?.jailSentence?.fine ?? 0) },
            { label: 'Hospital release', value: formatDate(status?.hospitalStay?.releasedAt) },
            { label: 'Hospital bill', value: money(status?.hospitalStay?.bill ?? 0) },
          ]} />
        </Card>
      </Grid>

      <div style={{ height: 16 }} />
      <Card title="Recovery actions">
        <p style={{ color: '#a1a1aa', marginTop: 0 }}>Choose a recovery option without exposing internal service routes in the player interface. Hospital care posts through POST /api/legal/hospital.</p>
        <Grid>
          <GameActionForm
            endpoint="/api/legal/lawyer"
            label="Hire lawyer"
            payload={{ characterId: character.id }}
            fields={[{ name: 'tier', label: 'Lawyer tier', type: 'select', options: [
              { label: 'Public defender', value: 'public' },
              { label: 'Street lawyer', value: 'street' },
              { label: 'Firm lawyer', value: 'firm' },
            ] }]}
            successMessage="Lawyer service completed."
            idempotent={false}
          />
          <GameActionForm endpoint="/api/legal/bribe" label="Attempt bribe" payload={{ characterId: character.id }} successMessage="Bribe attempt resolved." idempotent={false} cooldown={getActionCooldown(actionLocks, 'legal_bribe')} />
          <GameActionForm
            endpoint="/api/legal/hospital"
            label="Buy hospital care"
            payload={{ characterId: character.id }}
            fields={[{ name: 'service', label: 'Care level', type: 'select', options: [
              { label: 'Basic', value: 'basic' },
              { label: 'Private', value: 'private' },
              { label: 'Specialist', value: 'specialist' },
            ] }]}
            successMessage="Hospital care purchased."
          />
        </Grid>
      </Card>
      <div style={{ height: 16 }} />
      <Card title="Recent legal services">
        {logs.length > 0 ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {logs.map((log) => (
              <article key={log.id} style={{ borderTop: '1px solid #27272a', paddingTop: 10 }}>
                <strong>{log.serviceType} / {log.serviceTier}</strong>
                <p style={{ color: '#a1a1aa', margin: '4px 0 0' }}>{money(log.cost)} - heat {log.heatBefore} to {log.heatAfter}</p>
              </article>
            ))}
          </div>
        ) : <EmptyState>No legal-service history yet.</EmptyState>}
      </Card>
    </GamePageShell>
  );
}

import { calculateBailSettlement, calculateFineSettlement } from '@drugdeal/game';
import {
  getCharacterStatusDetail,
  listActiveActionLocks,
  listLegalServiceLogs,
} from '@drugdeal/db';
import { GameActionForm } from '@/features/game/action-form';
import {
  Card,
  EmptyState,
  formatDate,
  GamePageShell,
  getActionCooldown,
  getActiveGameContext,
  Grid,
  money,
  StatList,
} from '@/features/game/game-page';

function getRemainingSeconds(date: Date | null | undefined) {
  return date ? Math.max(0, Math.ceil((date.getTime() - Date.now()) / 1000)) : 0;
}

export default async function LegalPage() {
  const { character } = await getActiveGameContext();
  const [status, logs, actionLocks] = await Promise.all([
    getCharacterStatusDetail(character.id),
    listLegalServiceLogs(character.id, 20),
    listActiveActionLocks(character.id),
  ]);
  const activeJailSentence = status?.jailSentence ?? null;
  const remainingJailSeconds = getRemainingSeconds(activeJailSentence?.releaseAt);
  const fineSettlement = activeJailSentence
    ? calculateFineSettlement({
        fine: activeJailSentence.fine,
        severity: activeJailSentence.severity,
        remainingSeconds: remainingJailSeconds,
        cash: character.cash,
        bank: character.bank,
        paymentSource: 'cash',
      })
    : null;
  const bailSettlement = activeJailSentence
    ? calculateBailSettlement({
        fine: activeJailSentence.fine,
        severity: activeJailSentence.severity,
        remainingSeconds: remainingJailSeconds,
        cash: character.cash,
        bank: character.bank,
        paymentSource: 'cash',
      })
    : null;
  const jailActionDisabled = !activeJailSentence;
  const jailActionReason = jailActionDisabled ? 'Requires an active jail sentence.' : null;

  return (
    <GamePageShell
      sidebarCharacter={character}
      title="Legal and hospital"
      eyebrow={character.name}
      description="Track jail, hospital, lawyer, bribe, court, bail, and recovery state from one MVP status page."
    >
      <Grid>
        <Card title="Current status">
          <StatList
            items={[
              { label: 'Character status', value: character.status },
              { label: 'Blocked until', value: formatDate(status?.blockedUntil) },
              { label: 'Reason', value: status?.reason ?? 'Clear' },
              { label: 'Heat', value: character.heat },
              { label: 'Health', value: `${character.health}/100` },
            ]}
          />
        </Card>
        <Card title="Active penalties">
          <StatList
            items={[
              { label: 'Jail release', value: formatDate(activeJailSentence?.releaseAt) },
              { label: 'Fine', value: money(activeJailSentence?.fine ?? 0) },
              {
                label: 'Estimated fine settlement',
                value: fineSettlement ? money(fineSettlement.cost) : money(0),
              },
              {
                label: 'Estimated bail',
                value: bailSettlement ? money(bailSettlement.cost) : money(0),
              },
              { label: 'Hospital release', value: formatDate(status?.hospitalStay?.releasedAt) },
              { label: 'Hospital bill', value: money(status?.hospitalStay?.bill ?? 0) },
            ]}
          />
        </Card>
      </Grid>

      <div style={{ height: 16 }} />
      <Card title="Recovery actions">
        <p style={{ color: '#a1a1aa', marginTop: 0 }}>
          Choose a recovery option without exposing internal service routes in the player interface.
          Hospital care posts through POST /api/legal/hospital.
        </p>
        <Grid>
          <GameActionForm
            endpoint="/api/legal/lawyer"
            label="Hire lawyer"
            payload={{ characterId: character.id }}
            fields={[
              {
                name: 'tier',
                label: 'Lawyer tier',
                type: 'select',
                options: [
                  { label: 'Public defender', value: 'public' },
                  { label: 'Street lawyer', value: 'street' },
                  { label: 'Firm lawyer', value: 'firm' },
                ],
              },
            ]}
            successMessage="Lawyer service completed."
            idempotent={false}
          />
          <GameActionForm
            endpoint="/api/legal/bribe"
            label="Attempt bribe"
            payload={{ characterId: character.id }}
            successMessage="Bribe attempt resolved."
            idempotent={false}
            cooldown={getActionCooldown(actionLocks, 'legal_bribe')}
          />
          <GameActionForm
            endpoint="/api/legal/hospital"
            label="Buy hospital care"
            payload={{ characterId: character.id }}
            fields={[
              {
                name: 'service',
                label: 'Care level',
                type: 'select',
                options: [
                  { label: 'Basic', value: 'basic' },
                  { label: 'Private', value: 'private' },
                  { label: 'Specialist', value: 'specialist' },
                ],
              },
            ]}
            successMessage="Hospital care purchased."
          />
        </Grid>
      </Card>

      <div style={{ height: 16 }} />
      <Card title="Jail resolution">
        <p style={{ color: '#a1a1aa', marginTop: 0 }}>
          Settle an active sentence through abstract, fictional MVP actions. Court and jail
          activities use cooldowns to prevent repeat-spam.
        </p>
        <Grid>
          <GameActionForm
            endpoint="/api/legal/jail"
            label="Pay fine"
            payload={{ characterId: character.id, action: 'pay_fine' }}
            fields={[
              {
                name: 'paymentSource',
                label: 'Payment source',
                type: 'select',
                options: [
                  { label: 'Cash', value: 'cash' },
                  { label: 'Bank', value: 'bank' },
                ],
              },
            ]}
            helper={
              fineSettlement ? `Estimated cost: ${money(fineSettlement.cost)}.` : 'No active fine.'
            }
            successMessage="Fine settlement completed."
            disabled={jailActionDisabled}
            disabledReason={jailActionReason}
          />
          <GameActionForm
            endpoint="/api/legal/jail"
            label="Post bail"
            payload={{ characterId: character.id, action: 'post_bail' }}
            fields={[
              {
                name: 'paymentSource',
                label: 'Payment source',
                type: 'select',
                options: [
                  { label: 'Cash', value: 'cash' },
                  { label: 'Bank', value: 'bank' },
                ],
              },
            ]}
            helper={
              bailSettlement
                ? `Estimated cost: ${money(bailSettlement.cost)}.`
                : 'No active bail offer.'
            }
            successMessage="Bail posted."
            disabled={jailActionDisabled}
            disabledReason={jailActionReason}
          />
          <GameActionForm
            endpoint="/api/legal/court"
            label="Request court hearing"
            payload={{ characterId: character.id }}
            fields={[
              {
                name: 'plea',
                label: 'Approach',
                type: 'select',
                options: [
                  { label: 'Take responsibility', value: 'responsible' },
                  { label: 'Contest outcome', value: 'contest' },
                  { label: 'Request deferment', value: 'defer' },
                ],
              },
            ]}
            successMessage="Court hearing resolved."
            disabled={jailActionDisabled}
            disabledReason={jailActionReason}
            cooldown={getActionCooldown(actionLocks, 'legal_court')}
          />
          <GameActionForm
            endpoint="/api/legal/jail"
            label="Do jail activity"
            payload={{ characterId: character.id, action: 'jail_activity' }}
            fields={[
              {
                name: 'activity',
                label: 'Activity',
                type: 'select',
                options: [
                  { label: 'Library study', value: 'library' },
                  { label: 'Work detail', value: 'work_detail' },
                  { label: 'Fitness yard', value: 'fitness_yard' },
                ],
              },
            ]}
            successMessage="Jail activity completed."
            disabled={jailActionDisabled}
            disabledReason={jailActionReason}
            cooldown={getActionCooldown(actionLocks, 'jail_activity')}
          />
        </Grid>
      </Card>

      <div style={{ height: 16 }} />
      <Card title="Recent legal services">
        {logs.length > 0 ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {logs.map((log) => (
              <article key={log.id} style={{ borderTop: '1px solid #27272a', paddingTop: 10 }}>
                <strong>
                  {log.serviceType} / {log.serviceTier}
                </strong>
                <p style={{ color: '#a1a1aa', margin: '4px 0 0' }}>
                  {money(log.cost)} - heat {log.heatBefore} to {log.heatAfter}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState>No legal-service history yet.</EmptyState>
        )}
      </Card>
    </GamePageShell>
  );
}

import { getFactionForCharacter, listFactions, listTerritories } from '@drugdeal/db';
import { GameActionForm } from '@/features/game/action-form';
import { Card, EmptyState, GamePageShell, getActiveGameContext, Grid, money, StatList } from '@/features/game/game-page';

export default async function FactionsPage() {
  const { character } = await getActiveGameContext();
  const [factions, ownFaction, territories] = await Promise.all([
    listFactions(),
    getFactionForCharacter(character.id),
    listTerritories(),
  ]);

  return (
    <GamePageShell sidebarCharacter={character} title="Factions and territory" eyebrow={character.name} description="Track crews, memberships, controlled territories, and territory contest state.">
      <Grid>
        <Card title="Your faction">
          {ownFaction?.faction ? (
            <>
              <h3 style={{ marginTop: 0 }}>{ownFaction.faction.name} [{ownFaction.faction.tag}]</h3>
              <StatList items={[
                { label: 'Role', value: ownFaction.membership.role },
                { label: 'Bank', value: money(ownFaction.faction.bank) },
                { label: 'Members', value: ownFaction.members.length },
                { label: 'Territories', value: ownFaction.controlledTerritories.length },
              ]} />
              <GameActionForm endpoint={`/api/factions/${ownFaction.faction.id}/leave`} label="Leave faction" payload={{ characterId: character.id }} successMessage="Faction left." idempotent={false} />
            </>
          ) : (
            <>
              <EmptyState>You are not in a faction yet.</EmptyState>
              <GameActionForm
                endpoint="/api/factions"
                label="Create faction"
                payload={{ characterId: character.id }}
                fields={[
                  { name: 'name', label: 'Name', placeholder: 'Northside Crew' },
                  { name: 'tag', label: 'Tag', placeholder: 'NSC' },
                  { name: 'description', label: 'Description', placeholder: 'Optional faction description', omitWhenEmpty: true },
                ]}
                successMessage="Faction created."
                idempotent={false}
              />
            </>
          )}
        </Card>
        <Card title="Faction directory" meta={`${factions.length} crews`}>
          {factions.length > 0 ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {factions.map((faction) => (
                <article key={faction.id} style={{ borderTop: '1px solid #27272a', paddingTop: 10 }}>
                  <strong>{faction.name} [{faction.tag}]</strong>
                  <p style={{ color: '#a1a1aa', margin: '4px 0 0' }}>{faction.description} - Reputation {faction.reputation}</p>
                  {!ownFaction?.faction ? (
                    <GameActionForm endpoint={`/api/factions/${faction.id}/join`} label="Join faction" payload={{ characterId: character.id }} successMessage="Faction joined." idempotent={false} />
                  ) : null}
                </article>
              ))}
            </div>
          ) : <EmptyState>No factions have been created yet.</EmptyState>}
        </Card>
      </Grid>
      <div style={{ height: 16 }} />
      <Card title="Territories" meta={`${territories.length} regions`}>
        {territories.length > 0 ? (
          <Grid min={220}>
            {territories.map((territory) => (
              <article key={territory.key} style={{ borderTop: '1px solid #27272a', paddingTop: 10 }}>
                <strong>{territory.name}</strong>
                <p style={{ color: '#a1a1aa', margin: '4px 0 0' }}>{territory.location} - income {money(territory.incomePerTick)} - control {territory.controlScore}</p>
              </article>
            ))}
          </Grid>
        ) : <EmptyState>No territories are configured yet.</EmptyState>}
      </Card>
    </GamePageShell>
  );
}

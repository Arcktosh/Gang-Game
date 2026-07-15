import { and, eq, ne } from 'drizzle-orm';
import { canCreateFactionContract, describeContractScope } from '@drugdeal/game';
import { characters, db, getFactionForCharacter, listActiveActionLocks, listContracts } from '@drugdeal/db';
import { GameActionForm } from '@/features/game/action-form';
import { Card, formatDate, GamePageShell, getActionCooldown, getActiveGameContext, Grid, money, StatList } from '@/features/game/game-page';

const contractTypeOptions = [
  { label: 'Delivery', value: 'delivery' },
  { label: 'Protection', value: 'protection' },
  { label: 'Collection', value: 'collection' },
  { label: 'Bounty', value: 'bounty' },
  { label: 'Faction task', value: 'faction_task' },
];

export default async function ContractsPage() {
  const { character } = await getActiveGameContext();
  const [contractCenter, actionLocks, sameLocationCharacters, items, ownFaction] = await Promise.all([
    listContracts({ userId: character.userId, characterId: character.id }),
    listActiveActionLocks(character.id),
    db.query.characters.findMany({
      where: and(eq(characters.location, character.location), ne(characters.id, character.id)),
      orderBy: (row, { asc }) => [asc(row.name)],
      limit: 50,
    }),
    db.query.itemDefinitions.findMany({ orderBy: (row, { asc }) => [asc(row.name)], limit: 100 }),
    getFactionForCharacter(character.id),
  ]);

  const contracts = contractCenter ?? { openContracts: [], mine: [] };
  const createCooldown = getActionCooldown(actionLocks, 'contract_create');
  const acceptCooldown = getActionCooldown(actionLocks, 'contract_accept');
  const completeCooldown = getActionCooldown(actionLocks, 'contract_complete');
  const ownFactionId = ownFaction?.faction?.id ?? null;
  const ownRole = ownFaction?.membership.role ?? 'recruit';
  const canPostFactionContract = ownFactionId ? canCreateFactionContract(ownRole) : false;
  const recipientOptions = sameLocationCharacters.map((entry) => ({
    label: `${entry.name} · level ${entry.level}`,
    value: entry.id,
  }));
  const factionRecipientOptions = [
    { label: 'Anyone in faction', value: '' },
    ...(ownFaction?.memberCharacters ?? [])
      .filter((entry) => entry.id !== character.id)
      .map((entry) => ({ label: `${entry.name} · ${entry.status}`, value: entry.id })),
  ];
  const itemOptions = [
    { label: 'No item requirement', value: '' },
    ...items.map((item) => ({ label: `${item.name} · ${item.category}`, value: item.key })),
  ];
  const actionableOpenContracts = contracts.openContracts.filter(
    (contract) => contract.createdByCharacterId !== character.id,
  );

  return (
    <GamePageShell
      sidebarCharacter={character}
      title="Contracts"
      eyebrow={character.location}
      description="Post public jobs, private assignments, and faction tasks with escrowed rewards, acceptance locks, and completion checks."
    >
      <Grid>
        <Card title="Post public contract" meta="Visible to all eligible players">
          <GameActionForm
            endpoint="/api/contracts"
            label="Post public contract"
            payload={{ characterId: character.id }}
            fields={[
              { name: 'contractType', label: 'Type', type: 'select', options: contractTypeOptions.filter((option) => option.value !== 'faction_task'), defaultValue: 'delivery' },
              { name: 'title', label: 'Title', placeholder: 'Move a package across town' },
              { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Optional instructions', omitWhenEmpty: true },
              { name: 'targetLocation', label: 'Target location', placeholder: character.location, omitWhenEmpty: true },
              { name: 'itemKey', label: 'Required item', type: 'select', options: itemOptions, omitWhenEmpty: true },
              { name: 'quantity', label: 'Quantity', type: 'number', defaultValue: 0, min: 0, max: 1000 },
              { name: 'reward', label: 'Reward', type: 'number', defaultValue: 250, min: 25, max: 1_000_000 },
              { name: 'expiresInHours', label: 'Expires in hours', type: 'number', defaultValue: 24, min: 1, max: 168 },
            ]}
            successMessage="Public contract posted."
            cooldown={createCooldown}
          />
        </Card>

        {recipientOptions.length > 0 ? (
          <Card title="Assign private contract" meta={`${recipientOptions.length} local recipients`}>
            <GameActionForm
              endpoint="/api/contracts"
              label="Assign private contract"
              payload={{ characterId: character.id }}
              fields={[
                { name: 'assignedToCharacterId', label: 'Recipient', type: 'select', options: recipientOptions },
                { name: 'contractType', label: 'Type', type: 'select', options: contractTypeOptions.filter((option) => option.value !== 'faction_task'), defaultValue: 'delivery' },
                { name: 'title', label: 'Title', placeholder: 'Private delivery assignment' },
                { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Optional instructions', omitWhenEmpty: true },
                { name: 'targetLocation', label: 'Target location', placeholder: character.location, omitWhenEmpty: true },
                { name: 'itemKey', label: 'Required item', type: 'select', options: itemOptions, omitWhenEmpty: true },
                { name: 'quantity', label: 'Quantity', type: 'number', defaultValue: 0, min: 0, max: 1000 },
                { name: 'reward', label: 'Reward', type: 'number', defaultValue: 250, min: 25, max: 1_000_000 },
                { name: 'expiresInHours', label: 'Expires in hours', type: 'number', defaultValue: 24, min: 1, max: 168 },
              ]}
              successMessage="Private contract assigned."
              cooldown={createCooldown}
            />
          </Card>
        ) : null}

        {canPostFactionContract ? (
          <Card title="Post faction task" meta={ownFaction?.faction ? `${ownFaction.faction.name} operations` : 'No faction'}>
            <GameActionForm
              endpoint="/api/contracts"
              label="Post faction task"
              payload={{ characterId: character.id, contractType: 'faction_task', factionId: ownFactionId ?? undefined }}
              fields={[
                { name: 'assignedToCharacterId', label: 'Assignment', type: 'select', options: factionRecipientOptions, omitWhenEmpty: true },
                { name: 'title', label: 'Title', placeholder: 'Secure a faction route' },
                { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Crew-only instructions', omitWhenEmpty: true },
                { name: 'targetLocation', label: 'Target location', placeholder: character.location, omitWhenEmpty: true },
                { name: 'reward', label: 'Reward', type: 'number', defaultValue: 500, min: 25, max: 1_000_000 },
                { name: 'expiresInHours', label: 'Expires in hours', type: 'number', defaultValue: 48, min: 1, max: 168 },
              ]}
              successMessage="Faction task posted."
              cooldown={createCooldown}
            />
          </Card>
        ) : null}
      </Grid>

      {actionableOpenContracts.length > 0 ? (
        <>
          <div style={{ height: 16 }} />
          <Card title="Available contracts" meta={`${actionableOpenContracts.length} available`}>
            <Grid min={260}>
              {actionableOpenContracts.map((contract) => (
                <article key={contract.id} style={{ borderTop: '1px solid #27272a', paddingTop: 12 }}>
                  <strong>{contract.title}</strong>
                  <p style={{ color: '#a1a1aa', margin: '4px 0 8px' }}>{contract.description || 'No description provided.'}</p>
                  <StatList
                    items={[
                      { label: 'Scope', value: describeContractScope(contract) },
                      { label: 'Type', value: contract.contractType },
                      { label: 'Reward', value: money(contract.reward) },
                      { label: 'Risk', value: contract.risk },
                      { label: 'Target', value: contract.targetLocation ?? 'Any location' },
                      { label: 'Item', value: contract.itemName ?? contract.itemKey ?? 'None' },
                      { label: 'Expires', value: formatDate(contract.expiresAt) },
                    ]}
                  />
                  <GameActionForm
                    endpoint={`/api/contracts/${contract.id}/accept`}
                    label="Accept contract"
                    payload={{ characterId: character.id }}
                    successMessage="Contract accepted."
                    cooldown={acceptCooldown}
                  />
                </article>
              ))}
            </Grid>
          </Card>
        </>
      ) : null}

      {contracts.mine.length > 0 ? (
        <>
          <div style={{ height: 16 }} />
          <Card title="Your contract activity" meta={`${contracts.mine.length} records`}>
            <div style={{ display: 'grid', gap: 12 }}>
              {contracts.mine.map((contract) => {
                const isCreator = contract.createdByCharacterId === character.id;
                const isAssignee = contract.assignedToCharacterId === character.id;
                return (
                  <article key={contract.id} style={{ borderTop: '1px solid #27272a', paddingTop: 12 }}>
                    <strong>{contract.title}</strong>
                    <StatList
                      items={[
                        { label: 'Status', value: contract.status },
                        { label: 'Scope', value: describeContractScope(contract) },
                        { label: 'Reward', value: money(contract.reward) },
                        { label: 'Target', value: contract.targetLocation ?? 'Any location' },
                        { label: 'Created', value: formatDate(contract.createdAt) },
                        { label: 'Expires', value: formatDate(contract.expiresAt) },
                      ]}
                    />
                    <div style={{ display: 'grid', gap: 8 }}>
                      <GameActionForm
                        endpoint={`/api/contracts/${contract.id}/complete`}
                        label="Complete contract"
                        payload={{ characterId: character.id }}
                        successMessage="Contract completed."
                        cooldown={completeCooldown}
                        hidden={contract.status !== 'accepted' || !isAssignee}
                      />
                      <GameActionForm
                        endpoint={`/api/contracts/${contract.id}/cancel`}
                        label="Cancel contract"
                        payload={{ characterId: character.id }}
                        successMessage="Contract cancelled and escrow refunded."
                        hidden={contract.status !== 'open' || !isCreator}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          </Card>
        </>
      ) : null}

    </GamePageShell>
  );
}

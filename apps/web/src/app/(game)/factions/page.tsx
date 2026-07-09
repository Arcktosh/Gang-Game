import { canManageFactionArmory, canSetFactionRole, canWithdrawFactionFunds } from '@drugdeal/game';
import {
  getFactionForCharacter,
  listActiveActionLocks,
  listFactions,
  listTerritories,
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

const assignableRoles = [
  { label: 'Recruit', value: 'recruit' },
  { label: 'Runner', value: 'runner' },
  { label: 'Soldier', value: 'soldier' },
  { label: 'Lieutenant', value: 'lieutenant' },
  { label: 'Captain', value: 'captain' },
  { label: 'Underboss', value: 'underboss' },
];

export default async function FactionsPage() {
  const { character } = await getActiveGameContext();
  const [factions, ownFaction, territories, activeLocks] = await Promise.all([
    listFactions(),
    getFactionForCharacter(character.id),
    listTerritories(),
    listActiveActionLocks(character.id),
  ]);
  const territoryCooldown = getActionCooldown(activeLocks, 'faction_action');
  const armoryCooldown = getActionCooldown(activeLocks, 'faction_inventory');
  const ownFactionId = ownFaction?.faction?.id ?? null;
  const ownRole = ownFaction?.membership.role ?? 'recruit';
  const canWithdraw = canWithdrawFactionFunds(ownRole);
  const canUseArmory = canManageFactionArmory(ownRole);
  const characterById = new Map(
    ownFaction?.memberCharacters.map((member) => [member.id, member]) ?? [],
  );
  const factionById = new Map(factions.map((faction) => [faction.id, faction]));

  return (
    <GamePageShell
      sidebarCharacter={character}
      title="Factions and territory"
      eyebrow={character.name}
      description="Manage crew membership, bank permissions, member ranks, and territory control from one operations page."
    >
      <Grid>
        <Card title="Your faction">
          {ownFaction?.faction ? (
            <>
              <h3 style={{ marginTop: 0 }}>
                {ownFaction.faction.name} [{ownFaction.faction.tag}]
              </h3>
              <StatList
                items={[
                  { label: 'Role', value: ownFaction.membership.role },
                  { label: 'Bank', value: money(ownFaction.faction.bank) },
                  { label: 'Power', value: ownFaction.faction.power },
                  { label: 'Reputation', value: ownFaction.faction.reputation },
                  { label: 'Members', value: ownFaction.members.length },
                  { label: 'Territories', value: ownFaction.controlledTerritories.length },
                  { label: 'Contribution points', value: ownFaction.membership.contributionPoints },
                ]}
              />
              <GameActionForm
                endpoint={`/api/factions/${ownFactionId ?? ''}/leave`}
                label="Leave faction"
                payload={{ characterId: character.id }}
                successMessage="Faction left."
                idempotent={false}
              />
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
                  {
                    name: 'description',
                    label: 'Description',
                    placeholder: 'Optional faction description',
                    omitWhenEmpty: true,
                  },
                ]}
                successMessage="Faction created."
                idempotent={false}
              />
            </>
          )}
        </Card>

        <Card
          title="Faction bank"
          meta={ownFaction?.faction ? money(ownFaction.faction.bank) : 'No active crew'}
        >
          {ownFaction?.faction ? (
            <div style={{ display: 'grid', gap: 10 }}>
              <GameActionForm
                endpoint={`/api/factions/${ownFactionId ?? ''}/bank`}
                label="Deposit faction funds"
                payload={{ characterId: character.id, action: 'deposit' }}
                fields={[
                  {
                    name: 'amount',
                    label: 'Amount',
                    type: 'number',
                    min: 1,
                    max: 1_000_000,
                    defaultValue: 100,
                  },
                ]}
                successMessage="Faction deposit recorded."
              />
              <GameActionForm
                endpoint={`/api/factions/${ownFactionId ?? ''}/bank`}
                label="Withdraw faction funds"
                payload={{ characterId: character.id, action: 'withdraw' }}
                fields={[
                  {
                    name: 'amount',
                    label: 'Amount',
                    type: 'number',
                    min: 1,
                    max: 1_000_000,
                    defaultValue: 100,
                  },
                ]}
                successMessage="Faction withdrawal recorded."
                disabled={!canWithdraw}
                disabledReason={
                  !canWithdraw
                    ? 'Only underbosses and bosses can withdraw faction funds.'
                    : undefined
                }
              />
            </div>
          ) : (
            <EmptyState>Join or create a faction before using the faction bank.</EmptyState>
          )}
        </Card>
      </Grid>

      <div style={{ height: 16 }} />

      <Grid>
        <Card
          title="Faction armory"
          meta={
            ownFaction?.armory.length ? `${ownFaction.armory.length} stocked items` : 'No stock'
          }
        >
          {ownFaction?.faction ? (
            <div style={{ display: 'grid', gap: 14 }}>
              {ownFaction.armory.length > 0 ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  {ownFaction.armory.map((stack) => (
                    <article
                      key={stack.id}
                      style={{ borderTop: '1px solid #27272a', paddingTop: 10 }}
                    >
                      <strong>{stack.item?.name ?? stack.itemKey}</strong>
                      <StatList
                        items={[
                          { label: 'Quantity', value: stack.quantity },
                          { label: 'Rarity', value: stack.item?.rarity ?? 'common' },
                          { label: 'Estimated value', value: money(stack.exposure.estimatedValue) },
                          { label: 'Risk score', value: stack.exposure.riskScore },
                        ]}
                      />
                      <GameActionForm
                        endpoint={`/api/factions/${ownFactionId ?? ''}/inventory`}
                        label="Withdraw armory stock"
                        payload={{
                          characterId: character.id,
                          action: 'withdraw',
                          factionInventoryItemId: stack.id,
                        }}
                        fields={[
                          {
                            name: 'quantity',
                            label: 'Quantity',
                            type: 'number',
                            min: 1,
                            max: stack.quantity,
                            defaultValue: 1,
                          },
                        ]}
                        successMessage="Armory withdrawal completed."
                        cooldown={armoryCooldown}
                        disabled={!canUseArmory}
                        disabledReason={
                          !canUseArmory
                            ? 'Only lieutenants and above can withdraw from the faction armory.'
                            : undefined
                        }
                      />
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState>No faction inventory has been stocked yet.</EmptyState>
              )}
            </div>
          ) : (
            <EmptyState>Join or create a faction before using the faction armory.</EmptyState>
          )}
        </Card>

        <Card
          title="Stock the armory"
          meta={
            ownFaction?.characterInventory.length
              ? `${ownFaction.characterInventory.length} personal stacks`
              : 'No inventory'
          }
        >
          {ownFaction?.faction ? (
            ownFaction.characterInventory.length > 0 ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {ownFaction.characterInventory.map((stack) => (
                  <article
                    key={stack.id}
                    style={{ borderTop: '1px solid #27272a', paddingTop: 10 }}
                  >
                    <strong>{stack.item?.name ?? stack.itemKey}</strong>
                    <p style={{ color: '#a1a1aa', margin: '4px 0 8px' }}>
                      Personal stock: {stack.quantity} - {stack.item?.category ?? 'item'}
                    </p>
                    <GameActionForm
                      endpoint={`/api/factions/${ownFactionId ?? ''}/inventory`}
                      label="Deposit to armory"
                      payload={{
                        characterId: character.id,
                        action: 'deposit',
                        inventoryItemId: stack.id,
                      }}
                      fields={[
                        {
                          name: 'quantity',
                          label: 'Quantity',
                          type: 'number',
                          min: 1,
                          max: stack.quantity,
                          defaultValue: 1,
                        },
                      ]}
                      successMessage="Armory deposit completed."
                      cooldown={armoryCooldown}
                    />
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState>Your character has no inventory stacks available to deposit.</EmptyState>
            )
          ) : (
            <EmptyState>Join or create a faction before stocking armory items.</EmptyState>
          )}
        </Card>
      </Grid>

      <div style={{ height: 16 }} />

      <Grid>
        <Card
          title="Member ranks and permissions"
          meta={ownFaction?.members.length ? `${ownFaction.members.length} active` : 'No crew'}
        >
          {ownFaction?.faction && ownFaction.members.length > 0 ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {ownFaction.members.map((member) => {
                const profile = characterById.get(member.characterId);
                const canChangeRole =
                  member.characterId !== character.id && canSetFactionRole(ownRole, member.role);

                return (
                  <article
                    key={member.characterId}
                    style={{ borderTop: '1px solid #27272a', paddingTop: 10 }}
                  >
                    <strong>{profile?.name ?? member.characterId}</strong>
                    <StatList
                      items={[
                        { label: 'Role', value: member.role },
                        { label: 'Level', value: profile?.level ?? 'Unknown' },
                        { label: 'Location', value: profile?.location ?? 'Unknown' },
                        { label: 'Status', value: profile?.status ?? 'Unknown' },
                        { label: 'Contribution', value: member.contributionPoints },
                      ]}
                    />
                    <GameActionForm
                      endpoint={`/api/factions/${ownFaction.faction?.id ?? ''}/members`}
                      method="PATCH"
                      label="Update role"
                      payload={{ characterId: character.id, memberCharacterId: member.characterId }}
                      fields={[
                        {
                          name: 'role',
                          label: 'New role',
                          type: 'select',
                          options: assignableRoles,
                          defaultValue: member.role === 'boss' ? 'underboss' : member.role,
                        },
                      ]}
                      successMessage="Faction member role updated."
                      idempotent={false}
                      disabled={!canChangeRole}
                      disabledReason={
                        !canChangeRole
                          ? member.role === 'boss'
                            ? 'Boss roles cannot be reassigned from this control.'
                            : 'Only the faction boss can assign member ranks.'
                          : undefined
                      }
                    />
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState>Join or create a faction to manage member permissions.</EmptyState>
          )}
        </Card>

        <Card title="Faction directory" meta={`${factions.length} crews`}>
          {factions.length > 0 ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {factions.map((faction) => (
                <article
                  key={faction.id}
                  style={{ borderTop: '1px solid #27272a', paddingTop: 10 }}
                >
                  <strong>
                    {faction.name} [{faction.tag}]
                  </strong>
                  <p style={{ color: '#a1a1aa', margin: '4px 0 0' }}>
                    {faction.description} - Reputation {faction.reputation} - Members{' '}
                    {faction.memberCount}
                  </p>
                  {!ownFaction?.faction ? (
                    <GameActionForm
                      endpoint={`/api/factions/${faction.id}/join`}
                      label="Join faction"
                      payload={{ characterId: character.id }}
                      successMessage="Faction joined."
                      idempotent={false}
                    />
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState>No factions have been created yet.</EmptyState>
          )}
        </Card>
      </Grid>

      <div style={{ height: 16 }} />

      <Card title="Territory operations" meta={`${territories.length} regions`}>
        {territories.length > 0 ? (
          <Grid min={240}>
            {territories.map((territory) => {
              const controller = territory.controlledByFactionId
                ? factionById.get(territory.controlledByFactionId)
                : null;
              const isOwnTerritory = territory.controlledByFactionId === ownFactionId;
              const isUncontrolled = !territory.controlledByFactionId;
              const canUseTerritoryActions = Boolean(ownFactionId);

              return (
                <article
                  key={territory.key}
                  style={{ borderTop: '1px solid #27272a', paddingTop: 10 }}
                >
                  <strong>{territory.name}</strong>
                  <p style={{ color: '#a1a1aa', margin: '4px 0 0' }}>
                    {territory.location} - income {money(territory.incomePerTick)} - defense{' '}
                    {territory.defenseRating} - control {territory.controlScore}
                  </p>
                  <StatList
                    items={[
                      {
                        label: 'Controller',
                        value: controller
                          ? `${controller.name} [${controller.tag}]`
                          : 'Uncontrolled',
                      },
                      { label: 'Contested until', value: formatDate(territory.contestedUntil) },
                    ]}
                  />
                  <div style={{ display: 'grid', gap: 8 }}>
                    <GameActionForm
                      endpoint="/api/territories/actions"
                      label="Scout territory"
                      payload={{
                        characterId: character.id,
                        territoryKey: territory.key,
                        action: 'scout',
                      }}
                      successMessage="Territory scouted."
                      cooldown={territoryCooldown}
                      disabled={!canUseTerritoryActions}
                      disabledReason={
                        !canUseTerritoryActions
                          ? 'Join a faction before taking territory actions.'
                          : undefined
                      }
                    />
                    <GameActionForm
                      endpoint="/api/territories/actions"
                      label="Claim territory"
                      payload={{
                        characterId: character.id,
                        territoryKey: territory.key,
                        action: 'claim',
                      }}
                      successMessage="Territory claim attempted."
                      cooldown={territoryCooldown}
                      hidden={!isUncontrolled}
                      disabled={!canUseTerritoryActions}
                      disabledReason={
                        !canUseTerritoryActions
                          ? 'Join a faction before taking territory actions.'
                          : undefined
                      }
                    />
                    <GameActionForm
                      endpoint="/api/territories/actions"
                      label="Reinforce territory"
                      payload={{
                        characterId: character.id,
                        territoryKey: territory.key,
                        action: 'reinforce',
                      }}
                      successMessage="Territory reinforced."
                      cooldown={territoryCooldown}
                      hidden={!isOwnTerritory}
                      disabled={!canUseTerritoryActions}
                      disabledReason={
                        !canUseTerritoryActions
                          ? 'Join a faction before taking territory actions.'
                          : undefined
                      }
                    />
                    <GameActionForm
                      endpoint="/api/territories/actions"
                      label="Attack territory"
                      payload={{
                        characterId: character.id,
                        territoryKey: territory.key,
                        action: 'attack',
                      }}
                      successMessage="Territory attack resolved."
                      cooldown={territoryCooldown}
                      hidden={isOwnTerritory || isUncontrolled}
                      disabled={!canUseTerritoryActions}
                      disabledReason={
                        !canUseTerritoryActions
                          ? 'Join a faction before taking territory actions.'
                          : undefined
                      }
                    />
                  </div>
                </article>
              );
            })}
          </Grid>
        ) : (
          <EmptyState>No territories are configured yet.</EmptyState>
        )}
      </Card>
    </GamePageShell>
  );
}

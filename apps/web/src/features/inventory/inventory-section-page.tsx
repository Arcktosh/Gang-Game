import { listActiveActionLocks, listInventoryProfile } from '@drugdeal/db';
import { GameActionForm } from '@/features/game/action-form';
import { CollapsibleCard } from '@/features/game/collapsible-card';
import {
  EmptyState,
  formatDate,
  GamePageShell,
  getActionCooldown,
  getActiveGameContext,
  Grid,
  money,
  StatList,
} from '@/features/game/game-page';

export type InventorySection = 'summary' | 'items' | 'transfers';

type InventoryProfileItem = {
  id: string;
  itemKey: string;
  quantity: number;
  durability?: number | null;
  updatedAt: string | Date;
  canUse: boolean;
  item: {
    key: string;
    name: string;
    category: string;
    description: string;
    basePrice: number;
    baseRisk: number;
    isIllegal: boolean;
    rarity: string;
    equipSlot?: string | null;
  } | null;
  exposure: {
    estimatedValue: number;
    riskScore: number;
    isHighRisk: boolean;
  };
};

type InventoryTransferCandidate = {
  id: string;
  name: string;
  location: string;
  level: number;
  status: string;
};

const inventorySectionConfig: Record<
  InventorySection,
  { title: string; description: string }
> = {
  summary: {
    title: 'Inventory summary',
    description: 'Review inventory value, risk, consumable readiness, and stack totals.',
  },
  items: {
    title: 'Inventory items',
    description: 'Inspect and use the item stacks held by your character.',
  },
  transfers: {
    title: 'Inventory transfers',
    description: 'Send eligible item stacks to characters in the same location.',
  },
};

export async function InventorySectionPage({ section }: { section: InventorySection }) {
  const { character } = await getActiveGameContext();
  const [profileResult, actionLocks] = await Promise.all([
    listInventoryProfile({ userId: character.userId, characterId: character.id }),
    listActiveActionLocks(character.id),
  ]);
  const config = inventorySectionConfig[section];

  if (!profileResult.ok) {
    return (
      <GamePageShell
        sidebarCharacter={character}
        title={config.title}
        eyebrow="Inventory"
        description={config.description}
      >
        <Grid>
          <CollapsibleCard title="Inventory unavailable" defaultOpen>
            <EmptyState>{profileResult.message}</EmptyState>
          </CollapsibleCard>
        </Grid>
      </GamePageShell>
    );
  }

  const profile = profileResult.data;
  const inventory = profile.inventory as InventoryProfileItem[];
  const candidates = profile.candidates as InventoryTransferCandidate[];
  const useCooldown = getActionCooldown(actionLocks, 'item_use');
  const transferCooldown = getActionCooldown(actionLocks, 'item_transfer');
  const recipientOptions = candidates.map((candidate) => ({
    label: `${candidate.name} · level ${candidate.level}`,
    value: candidate.id,
  }));
  const highRiskItems = inventory.filter((row) => row.exposure.isHighRisk);
  const consumables = inventory.filter((row) => row.canUse);

  return (
    <GamePageShell
      sidebarCharacter={character}
      title={config.title}
      eyebrow={character.location}
      description={config.description}
    >
      {section === 'summary' ? (
        <Grid>
          <CollapsibleCard title="Inventory totals" defaultOpen>
            <StatList
              items={[
                { label: 'Distinct stacks', value: profile.summary.distinctItems },
                { label: 'Total quantity', value: profile.summary.totalQuantity },
                { label: 'Estimated value', value: money(profile.summary.estimatedValue) },
                { label: 'Risk score', value: profile.summary.riskScore },
                { label: 'High-risk stacks', value: profile.summary.highRiskStacks },
                { label: 'Consumables', value: profile.summary.consumableStacks },
              ]}
            />
          </CollapsibleCard>
          <CollapsibleCard title="Consumable readiness" meta={`${consumables.length} stacks`}>
            {consumables.length > 0 ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {consumables.slice(0, 4).map((row) => (
                  <article key={row.id} style={{ borderTop: '1px solid #27272a', paddingTop: 10 }}>
                    <strong>{row.item?.name ?? row.itemKey}</strong>
                    <p style={{ color: '#a1a1aa', margin: '4px 0' }}>
                      Quantity {row.quantity} · {row.item?.rarity ?? 'common'} · updated{' '}
                      {formatDate(row.updatedAt)}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState>No consumable items are available.</EmptyState>
            )}
          </CollapsibleCard>
          <CollapsibleCard title="Risk review" meta={`${highRiskItems.length} stacks`}>
            {highRiskItems.length > 0 ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {highRiskItems.slice(0, 4).map((row) => (
                  <article key={row.id} style={{ borderTop: '1px solid #27272a', paddingTop: 10 }}>
                    <strong>{row.item?.name ?? row.itemKey}</strong>
                    <p style={{ color: '#a1a1aa', margin: '4px 0' }}>
                      Risk {row.exposure.riskScore} · estimated {money(row.exposure.estimatedValue)}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState>No high-risk inventory stacks.</EmptyState>
            )}
          </CollapsibleCard>
        </Grid>
      ) : null}

      {section === 'items' ? (
        <Grid>
          {inventory.length > 0 ? (
            inventory.map((row, index) => (
              <CollapsibleCard
                key={row.id}
                title={row.item?.name ?? row.itemKey}
                meta={`${row.quantity} owned · ${row.item?.rarity ?? 'common'}`}
                defaultOpen={index === 0}
              >
                <p style={{ color: '#a1a1aa', marginTop: 0 }}>
                  {row.item?.description || 'No item description available.'}
                </p>
                <StatList
                  items={[
                    { label: 'Category', value: row.item?.category ?? 'unknown' },
                    { label: 'Base price', value: money(row.item?.basePrice ?? 0) },
                    { label: 'Estimated stack value', value: money(row.exposure.estimatedValue) },
                    { label: 'Risk score', value: row.exposure.riskScore },
                    { label: 'Illegal flag', value: row.item?.isIllegal ? 'Yes' : 'No' },
                    { label: 'Updated', value: formatDate(row.updatedAt) },
                  ]}
                />
                <GameActionForm
                  endpoint="/api/inventory"
                  label="Use item"
                  payload={{ action: 'use', characterId: character.id, inventoryItemId: row.id }}
                  successMessage="Item used."
                  disabled={!row.canUse}
                  disabledReason={!row.canUse ? 'This stack is not consumable.' : undefined}
                  cooldown={useCooldown}
                />
              </CollapsibleCard>
            ))
          ) : (
            <CollapsibleCard title="No inventory" defaultOpen>
              <EmptyState>
                Buy from the market, shops, or receive transfers to build inventory.
              </EmptyState>
            </CollapsibleCard>
          )}
        </Grid>
      ) : null}

      {section === 'transfers' ? (
        <Grid>
          <CollapsibleCard title="Transfer rules" defaultOpen>
            <p style={{ color: '#a1a1aa', marginTop: 0 }}>
              Direct transfers are limited to free characters in the same location. Equipped final
              stacks must be unequipped first, and the action uses an idempotency key so duplicate
              submits do not double-transfer inventory.
            </p>
            <StatList
              items={[
                { label: 'Eligible recipients nearby', value: profile.candidates.length },
                {
                  label: 'Transfer cooldown',
                  value: transferCooldown ? transferCooldown.message : 'Ready',
                },
                { label: 'Location', value: character.location },
              ]}
            />
          </CollapsibleCard>
          {inventory.length > 0 ? (
            inventory.map((row) => (
              <CollapsibleCard
                key={`transfer-${row.id}`}
                title={`Transfer ${row.item?.name ?? row.itemKey}`}
                meta={`${row.quantity} available`}
              >
                <GameActionForm
                  endpoint="/api/inventory"
                  label="Transfer item"
                  submitLabel="Send transfer"
                  payload={{
                    action: 'transfer',
                    characterId: character.id,
                    inventoryItemId: row.id,
                  }}
                  fields={[
                    {
                      name: 'recipientCharacterId',
                      label: 'Recipient',
                      type: 'select',
                      options: recipientOptions,
                    },
                    {
                      name: 'quantity',
                      label: 'Quantity',
                      type: 'number',
                      min: 1,
                      max: row.quantity,
                      defaultValue: 1,
                    },
                  ]}
                  successMessage="Item transfer completed."
                  disabled={recipientOptions.length === 0 || row.quantity < 1}
                  disabledReason={
                    recipientOptions.length === 0
                      ? 'No eligible same-location recipients.'
                      : 'No quantity available.'
                  }
                  cooldown={transferCooldown}
                />
              </CollapsibleCard>
            ))
          ) : (
            <CollapsibleCard title="No transferable inventory">
              <EmptyState>No inventory stacks are available to transfer.</EmptyState>
            </CollapsibleCard>
          )}
        </Grid>
      ) : null}
    </GamePageShell>
  );
}

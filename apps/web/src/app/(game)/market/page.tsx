import { eq } from 'drizzle-orm';
import { db, inventoryItems, listActiveActionLocks, listMarketForLocation } from '@drugdeal/db';
import { GameActionForm } from '@/features/game/action-form';
import {
  Card,
  EmptyState,
  GamePageShell,
  getActionCooldown,
  getActiveGameContext,
  Grid,
  money,
} from '@/features/game/game-page';

export default async function MarketPage() {
  const { character } = await getActiveGameContext();
  const [market, inventory, actionLocks] = await Promise.all([
    listMarketForLocation(character.location),
    db.query.inventoryItems.findMany({ where: eq(inventoryItems.characterId, character.id) }),
    listActiveActionLocks(character.id),
  ]);

  return (
    <GamePageShell
      sidebarCharacter={character}
      title="Market"
      eyebrow={character.location}
      description="Buy and sell location-specific items while monitoring supply, demand, and inventory."
    >
      <Grid>
        <Card title="Local market" meta={`${market.length} items`}>
          {market.length > 0 ? (
            <div className="compact-market-grid">
              {market.map((entry) => (
                <article key={entry.itemKey} className="compact-market-card">
                  <div className="compact-market-card__header">
                    <strong>{entry.item.name}</strong>
                    <span>{entry.item.category}</span>
                  </div>
                  <p>{entry.item.description}</p>
                  <dl className="compact-market-card__stats">
                    <div>
                      <dt>Price</dt>
                      <dd>{money(entry.price)}</dd>
                    </div>
                    <div>
                      <dt>Supply</dt>
                      <dd>{entry.supply}</dd>
                    </div>
                    <div>
                      <dt>Demand</dt>
                      <dd>{entry.demand}</dd>
                    </div>
                  </dl>
                  <GameActionForm
                    endpoint="/api/market"
                    label="Buy"
                    submitLabel="Buy"
                    payload={{ characterId: character.id, itemKey: entry.itemKey, action: 'buy' }}
                    fields={[
                      {
                        name: 'quantity',
                        label: 'Qty',
                        type: 'number',
                        defaultValue: 1,
                        min: 1,
                        max: 100,
                      },
                    ]}
                    successMessage="Market purchase completed."
                    cooldown={getActionCooldown(actionLocks, 'market_buy')}
                  />
                </article>
              ))}
            </div>
          ) : (
            <EmptyState>No local market prices are available for this location.</EmptyState>
          )}
        </Card>
        <Card title="Inventory" meta={`${inventory.length} stacks`}>
          {inventory.length > 0 ? (
            <div className="compact-market-grid compact-market-grid--inventory">
              {inventory.map((item) => (
                <article key={item.id} className="compact-market-card compact-market-card--inventory">
                  <div className="compact-market-card__header">
                    <strong>{item.itemKey}</strong>
                    <span>Owned: {item.quantity}</span>
                  </div>
                  <GameActionForm
                    endpoint="/api/market"
                    label="Sell"
                    submitLabel="Sell"
                    payload={{ characterId: character.id, itemKey: item.itemKey, action: 'sell' }}
                    fields={[
                      {
                        name: 'quantity',
                        label: 'Qty',
                        type: 'number',
                        defaultValue: 1,
                        min: 1,
                        max: item.quantity,
                      },
                    ]}
                    successMessage="Market sale completed."
                    cooldown={getActionCooldown(actionLocks, 'market_sell')}
                  />
                </article>
              ))}
            </div>
          ) : (
            <EmptyState>Your inventory is empty.</EmptyState>
          )}
        </Card>
      </Grid>
    </GamePageShell>
  );
}

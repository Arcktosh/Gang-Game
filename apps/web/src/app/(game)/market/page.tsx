import { asc, eq } from 'drizzle-orm';
import {
  db,
  inventoryItems,
  itemDefinitions,
  itemImages,
  listActiveActionLocks,
  listActiveMarketEventsForLocation,
  listMarketForLocation,
} from '@drugdeal/db';
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
import { ProductImage, SupplyDemandGraph } from '@/features/game/product-display';

export default async function MarketPage() {
  const { character } = await getActiveGameContext();
  const [market, activeEvents, inventory, actionLocks] = await Promise.all([
    listMarketForLocation(character.location),
    listActiveMarketEventsForLocation(character.location),
    db
      .select({
        id: inventoryItems.id,
        itemKey: inventoryItems.itemKey,
        quantity: inventoryItems.quantity,
        itemName: itemDefinitions.name,
        itemCategory: itemDefinitions.category,
        itemDescription: itemDefinitions.description,
        imageAltText: itemImages.altText,
        imageUpdatedAt: itemImages.updatedAt,
      })
      .from(inventoryItems)
      .innerJoin(itemDefinitions, eq(inventoryItems.itemKey, itemDefinitions.key))
      .leftJoin(itemImages, eq(itemDefinitions.key, itemImages.itemKey))
      .where(eq(inventoryItems.characterId, character.id))
      .orderBy(asc(itemDefinitions.name)),
    listActiveActionLocks(character.id),
  ]);
  const marketByItemKey = new Map(market.map((entry) => [entry.itemKey, entry]));

  return (
    <GamePageShell
      sidebarCharacter={character}
      title="Market"
      eyebrow={character.location}
      description="Buy and sell location-specific items. Open a product's details for its description and current supply-versus-demand graph."
    >
      {activeEvents.length > 0 ? (
        <Card title="Active market alerts" meta={`${activeEvents.length} live`}>
          <div className="compact-market-grid">
            {activeEvents.map((event) => (
              <article key={event.id} className="compact-market-card">
                <div className="compact-market-card__header">
                  <strong>{event.event.name}</strong>
                  <span>{event.item?.name ?? event.itemKey}</span>
                </div>
                <p>{event.event.description}</p>
                <dl className="compact-market-card__stats">
                  <div>
                    <dt>Window</dt>
                    <dd>{event.status}</dd>
                  </div>
                  <div>
                    <dt>Risk</dt>
                    <dd>{event.event.riskDelta >= 0 ? '+' : ''}{event.event.riskDelta}</dd>
                  </div>
                  <div>
                    <dt>Price impact</dt>
                    <dd>{event.impact?.ok ? `${event.impact.priceDeltaPercent}%` : 'Pending'}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </Card>
      ) : null}

      <Grid>
        <Card title="Local market" meta={`${market.length} items`}>
          {market.length > 0 ? (
            <div className="product-grid">
              {market.map((entry) => (
                <article key={entry.itemKey} className="product-card">
                  <ProductImage
                    imageAltText={entry.item.imageAltText}
                    imageUpdatedAt={entry.item.imageUpdatedAt}
                    itemKey={entry.itemKey}
                    name={entry.item.name}
                  />
                  <div className="product-card__content">
                    <header className="product-card__header">
                      <div>
                        <h3>{entry.item.name}</h3>
                        <p>{entry.item.category}</p>
                      </div>
                      {entry.item.isIllegal ? <span className="product-badge">Restricted</span> : null}
                    </header>
                    <dl className="product-card__summary">
                      <div>
                        <dt>Price</dt>
                        <dd>{money(entry.price)}</dd>
                      </div>
                      <div>
                        <dt>Supply</dt>
                        <dd>{entry.supply}</dd>
                      </div>
                    </dl>
                    <GameActionForm
                      endpoint="/api/market"
                      label={`Buy ${entry.item.name}`}
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
                    <details className="product-details">
                      <summary>View details</summary>
                      <div className="product-details__body">
                        <p>{entry.item.description || 'No product description is available.'}</p>
                        <SupplyDemandGraph supply={entry.supply} demand={entry.demand} />
                      </div>
                    </details>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState>No local market prices are available for this location.</EmptyState>
          )}
        </Card>

        <Card title="Inventory" meta={`${inventory.length} stacks`}>
          {inventory.length > 0 ? (
            <div className="product-grid product-grid--inventory">
              {inventory.map((item) => {
                const localMarket = marketByItemKey.get(item.itemKey);

                return (
                  <article key={item.id} className="product-card product-card--inventory">
                    <ProductImage
                      imageAltText={item.imageAltText}
                      imageUpdatedAt={item.imageUpdatedAt}
                      itemKey={item.itemKey}
                      name={item.itemName}
                    />
                    <div className="product-card__content">
                      <header className="product-card__header">
                        <div>
                          <h3>{item.itemName}</h3>
                          <p>{item.itemCategory}</p>
                        </div>
                        <span className="product-badge">Owned {item.quantity}</span>
                      </header>
                      <GameActionForm
                        endpoint="/api/market"
                        label={`Sell ${item.itemName}`}
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
                      <details className="product-details">
                        <summary>View details</summary>
                        <div className="product-details__body">
                          <p>{item.itemDescription || 'No product description is available.'}</p>
                          {localMarket ? (
                            <SupplyDemandGraph supply={localMarket.supply} demand={localMarket.demand} />
                          ) : (
                            <p className="empty-state">No local supply and demand snapshot is available.</p>
                          )}
                        </div>
                      </details>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState>Your inventory is empty.</EmptyState>
          )}
        </Card>
      </Grid>
    </GamePageShell>
  );
}

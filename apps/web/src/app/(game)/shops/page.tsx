import { eq } from 'drizzle-orm';
import {
  db,
  inventoryItems,
  listActiveActionLocks,
  listActiveShopListings,
  listShops,
  listShopsForCharacter,
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

export default async function ShopsPage() {
  const { character } = await getActiveGameContext();
  const [shops, ownShops, listings, inventory, actionLocks] = await Promise.all([
    listShops(character.location),
    listShopsForCharacter(character.id),
    listActiveShopListings(character.location),
    db.query.inventoryItems.findMany({
      where: eq(inventoryItems.characterId, character.id),
      orderBy: (item, { asc }) => [asc(item.itemKey)],
    }),
    listActiveActionLocks(character.id),
  ]);

  const nonOwnedShops = shops.filter((shop) => shop.ownerCharacterId !== character.id);
  const purchasableListings = listings.filter(
    (listing) => listing.ownerCharacterId !== character.id,
  );

  return (
    <GamePageShell
      sidebarCharacter={character}
      title="Shops"
      eyebrow={character.location}
      description="Browse player shops, purchase listings, manage your storefronts, advertise stock, review sellers, and audit shop sales history."
    >
      <Grid>
        <Card
          title="Open a shop"
          meta={ownShops.length ? `${ownShops.length} owned` : 'Starter storefront'}
        >
          <p style={{ color: '#a1a1aa', marginTop: 0 }}>
            Opening a shop costs $250 and creates a local storefront where your inventory can be
            listed for other players.
          </p>
          <GameActionForm
            endpoint="/api/shops"
            label="Open shop"
            payload={{ characterId: character.id }}
            fields={[
              { name: 'name', label: 'Shop name', placeholder: 'Southside Supply' },
              {
                name: 'description',
                label: 'Description',
                type: 'textarea',
                placeholder: 'What does your shop sell?',
                omitWhenEmpty: true,
              },
            ]}
            successMessage="Shop opened."
            cooldown={getActionCooldown(actionLocks, 'shop_create')}
          />
        </Card>

        <Card title="Open shops" meta={`${shops.length} nearby`}>
          {shops.length > 0 ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {shops.map((shop) => (
                <article key={shop.id} style={{ borderTop: '1px solid #27272a', paddingTop: 10 }}>
                  <strong>{shop.name}</strong>
                  <p style={{ color: '#a1a1aa', margin: '4px 0' }}>
                    {shop.description || 'No description'}
                  </p>
                  <StatList
                    items={[
                      { label: 'Reputation', value: shop.reputation },
                      {
                        label: 'Rating',
                        value: shop.averageRating ? `${shop.averageRating}/5` : 'No reviews',
                      },
                      { label: 'Listings', value: shop.activeListingCount },
                      {
                        label: 'Visibility',
                        value: shop.isAdvertising ? 'Advertising' : 'Organic',
                      },
                    ]}
                  />
                  {shop.ownerCharacterId !== character.id ? (
                    <GameActionForm
                      endpoint="/api/shops/actions"
                      label="Review shop"
                      payload={{ characterId: character.id, shopId: shop.id, action: 'review' }}
                      fields={[
                        {
                          name: 'rating',
                          label: 'Rating',
                          type: 'number',
                          defaultValue: 5,
                          min: 1,
                          max: 5,
                        },
                        {
                          name: 'body',
                          label: 'Review note',
                          type: 'textarea',
                          placeholder: 'Optional review note',
                          omitWhenEmpty: true,
                        },
                      ]}
                      successMessage="Shop review saved."
                      idempotent={false}
                    />
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <EmptyState>No open shops in this location yet.</EmptyState>
          )}
        </Card>

        <Card title="Active listings" meta={`${purchasableListings.length} offers`}>
          {purchasableListings.length > 0 ? (
            <div style={{ display: 'grid', gap: 10 }}>
              {purchasableListings.map((listing) => {
                const remaining = listing.quantity - listing.soldQuantity;
                return (
                  <article
                    key={listing.listingId}
                    style={{ borderTop: '1px solid #27272a', paddingTop: 10 }}
                  >
                    <strong>{listing.itemName}</strong>
                    <p style={{ color: '#a1a1aa', margin: '4px 0 0' }}>
                      {listing.shopName} - {remaining} left at {money(listing.priceEach)} each ·{' '}
                      {listing.itemCategory}
                    </p>
                    <GameActionForm
                      endpoint="/api/shops/purchase"
                      label="Purchase listing"
                      payload={{ characterId: character.id, listingId: listing.listingId }}
                      fields={[
                        {
                          name: 'quantity',
                          label: 'Quantity',
                          type: 'number',
                          defaultValue: 1,
                          min: 1,
                          max: remaining,
                        },
                      ]}
                      successMessage="Shop purchase completed."
                      cooldown={getActionCooldown(actionLocks, 'shop_purchase')}
                    />
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState>No active third-party shop listings are available.</EmptyState>
          )}
        </Card>
      </Grid>

      <div style={{ height: 16 }} />
      <Card title="Your shop operations" meta={`${ownShops.length} storefronts`}>
        {ownShops.length > 0 ? (
          <div style={{ display: 'grid', gap: 18 }}>
            {ownShops.map((entry) => (
              <article
                key={entry.shop.id}
                style={{ borderTop: '1px solid #27272a', paddingTop: 14 }}
              >
                <header
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 12,
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <strong>{entry.shop.name}</strong>
                    <p style={{ color: '#a1a1aa', margin: '4px 0 0' }}>
                      {entry.listings.length} active listings -{' '}
                      {entry.shop.isOpen ? 'Open' : 'Closed'} -{' '}
                      {entry.shop.isAdvertising ? 'Promoted' : 'Not promoted'}
                    </p>
                  </div>
                  <span>
                    {entry.shop.averageRating ? `${entry.shop.averageRating}/5` : 'No rating'}
                  </span>
                </header>

                <div className="action-grid" style={{ marginTop: 12 }}>
                  <GameActionForm
                    endpoint="/api/shops/actions"
                    label={entry.shop.isOpen ? 'Close shop' : 'Open shop'}
                    payload={{
                      characterId: character.id,
                      shopId: entry.shop.id,
                      action: 'set_status',
                      isOpen: !entry.shop.isOpen,
                    }}
                    successMessage="Shop status updated."
                    idempotent={false}
                  />
                  <GameActionForm
                    endpoint="/api/shops/actions"
                    label="Advertise shop"
                    payload={{
                      characterId: character.id,
                      shopId: entry.shop.id,
                      action: 'advertise',
                    }}
                    fields={[
                      {
                        name: 'spend',
                        label: 'Spend',
                        type: 'number',
                        defaultValue: 100,
                        min: 25,
                        max: 25000,
                      },
                    ]}
                    helper="Every $25 buys roughly one hour of highlighted placement, capped at 72 hours."
                    successMessage="Shop advertising purchased."
                    idempotent={false}
                  />
                  {inventory.length > 0 ? (
                    <GameActionForm
                      endpoint="/api/shops/listings"
                      label="Create listing"
                      payload={{ characterId: character.id, shopId: entry.shop.id }}
                      fields={[
                        {
                          name: 'itemKey',
                          label: 'Inventory item',
                          type: 'select',
                          options: inventory.map((item) => ({
                            label: `${item.itemKey} (${item.quantity})`,
                            value: item.itemKey,
                          })),
                        },
                        {
                          name: 'quantity',
                          label: 'Quantity',
                          type: 'number',
                          defaultValue: 1,
                          min: 1,
                          max: 1000,
                        },
                        {
                          name: 'priceEach',
                          label: 'Price each',
                          type: 'number',
                          defaultValue: 100,
                          min: 1,
                          max: 1000000,
                        },
                      ]}
                      successMessage="Shop listing created."
                      cooldown={getActionCooldown(actionLocks, 'shop_list')}
                    />
                  ) : null}
                </div>

                <Grid min={300}>
                  <div>
                    <h3>Listing management</h3>
                    {entry.listings.length > 0 ? (
                      <div style={{ display: 'grid', gap: 8 }}>
                        {entry.listings.map((listing) => (
                          <div
                            key={listing.id}
                            style={{ borderTop: '1px solid #27272a', paddingTop: 8 }}
                          >
                            <strong>{listing.itemName}</strong>
                            <p style={{ color: '#a1a1aa', margin: '4px 0' }}>
                              {listing.quantity - listing.soldQuantity} / {listing.quantity} left at{' '}
                              {money(listing.priceEach)} each
                            </p>
                            <GameActionForm
                              endpoint="/api/shops/actions"
                              label="Cancel listing"
                              payload={{
                                characterId: character.id,
                                listingId: listing.id,
                                action: 'cancel_listing',
                              }}
                              successMessage="Listing cancelled and unsold inventory returned."
                              idempotent={false}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState>No active listings for this shop.</EmptyState>
                    )}
                  </div>

                  <div>
                    <h3>Sales and spend history</h3>
                    {entry.ledger.length > 0 ? (
                      <div style={{ display: 'grid', gap: 8 }}>
                        {entry.ledger.map((ledger) => (
                          <p
                            key={ledger.id}
                            style={{ borderTop: '1px solid #27272a', margin: 0, paddingTop: 8 }}
                          >
                            <strong>{ledger.entryType}</strong> · {money(ledger.amount)} ·{' '}
                            {ledger.description}
                            <br />
                            <span style={{ color: '#a1a1aa' }}>{formatDate(ledger.createdAt)}</span>
                          </p>
                        ))}
                      </div>
                    ) : (
                      <EmptyState>No ledger activity yet.</EmptyState>
                    )}
                  </div>

                  <div>
                    <h3>Reviews and active ads</h3>
                    {entry.activeAds.length ? (
                      <p>
                        {entry.activeAds.length} active campaign(s), next ending{' '}
                        {formatDate(entry.activeAds[0]?.endsAt)}.
                      </p>
                    ) : (
                      <p>No active ad campaigns.</p>
                    )}
                    {entry.reviews.length > 0 ? (
                      <div style={{ display: 'grid', gap: 8 }}>
                        {entry.reviews.map((review) => (
                          <p
                            key={review.id}
                            style={{ borderTop: '1px solid #27272a', margin: 0, paddingTop: 8 }}
                          >
                            <strong>{review.rating}/5</strong> from{' '}
                            {review.reviewer?.name ?? 'Unknown'} · {review.body || 'No note'}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <EmptyState>No shop reviews yet.</EmptyState>
                    )}
                  </div>
                </Grid>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState>
            You do not own a shop yet. Use the shop opening form above to create your first
            storefront.
          </EmptyState>
        )}
      </Card>
    </GamePageShell>
  );
}

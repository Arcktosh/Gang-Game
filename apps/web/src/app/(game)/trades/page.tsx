import { listActiveActionLocks, listPlayerTradeCenter } from '@drugdeal/db';
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

type TradeCenterData = Extract<Awaited<ReturnType<typeof listPlayerTradeCenter>>, { ok: true }>['data'];
type TradeOffer = TradeCenterData['sentOffers'][number];

function TradeOfferCard({
  offer,
  characterId,
  direction,
  acceptCooldown,
}: {
  offer: TradeOffer;
  characterId: string;
  direction: 'sent' | 'received';
  acceptCooldown?: ReturnType<typeof getActionCooldown>;
}) {
  const actorLabel = direction === 'sent' ? offer.buyer?.name ?? 'Unknown buyer' : offer.seller?.name ?? 'Unknown seller';
  const isOpen = offer.status === 'open' && !offer.isExpired;

  return (
    <article style={{ borderTop: '1px solid #27272a', paddingTop: 12 }}>
      <header style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
        <div>
          <strong>{offer.item?.name ?? offer.itemKey}</strong>
          <p style={{ color: '#a1a1aa', margin: '4px 0 0' }}>
            {direction === 'sent' ? 'To' : 'From'} {actorLabel} · {offer.quantity} at {money(offer.priceEach)} each
          </p>
        </div>
        <span>{offer.status}{offer.isExpired ? ' · expired window' : ''}</span>
      </header>
      <StatList
        items={[
          { label: 'Buyer cost', value: money(offer.buyerCost) },
          { label: 'Seller payout', value: money(offer.sellerPayout) },
          { label: 'Handling fee', value: money(offer.sellerFee) },
          { label: 'Expires', value: formatDate(offer.expiresAt) },
        ]}
      />
      {isOpen ? (
        <div className="action-grid" style={{ marginTop: 12 }}>
          {direction === 'received' ? (
            <GameActionForm
              endpoint={`/api/trades/${offer.id}`}
              label="Accept trade"
              submitLabel="Accept"
              payload={{ characterId, action: 'accept' }}
              successMessage="Trade accepted."
              cooldown={acceptCooldown}
            />
          ) : null}
          <GameActionForm
            endpoint={`/api/trades/${offer.id}`}
            label={direction === 'received' ? 'Decline trade' : 'Cancel trade'}
            submitLabel={direction === 'received' ? 'Decline' : 'Cancel'}
            payload={{ characterId, action: 'cancel' }}
            successMessage="Trade cancelled."
            idempotent={false}
          />
        </div>
      ) : null}
    </article>
  );
}

export default async function TradesPage() {
  const { session, character } = await getActiveGameContext();
  const [tradeCenter, actionLocks] = await Promise.all([
    listPlayerTradeCenter({ userId: session.user.id, characterId: character.id }),
    listActiveActionLocks(character.id),
  ]);

  if (!tradeCenter.ok) {
    return (
      <GamePageShell
        sidebarCharacter={character}
        title="Player trades"
        eyebrow={character.location}
        description="Create private reserved-inventory trades with nearby players."
      >
        <Card title="Trades unavailable">
          <EmptyState>{tradeCenter.message}</EmptyState>
        </Card>
      </GamePageShell>
    );
  }

  const { sentOffers, receivedOffers, inventory, candidates, summary } = tradeCenter.data;
  const acceptCooldown = getActionCooldown(actionLocks, 'trade_accept');
  const openSent = sentOffers.filter((offer) => offer.status === 'open' && !offer.isExpired);
  const openReceived = receivedOffers.filter((offer) => offer.status === 'open' && !offer.isExpired);
  const history = [...sentOffers, ...receivedOffers]
    .filter((offer) => offer.status !== 'open' || offer.isExpired)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
    .slice(0, 20);

  return (
    <GamePageShell
      sidebarCharacter={character}
      title="Player trades"
      eyebrow={character.location}
      description="Create private offers, reserve inventory safely, and let the recipient accept before money changes hands."
    >
      <Card title="Trade exposure" meta="Private offer summary">
        <StatList
          items={[
            { label: 'Open sent', value: summary.openSentCount },
            { label: 'Open received', value: summary.openReceivedCount },
            { label: 'Reserved value', value: money(summary.reservedInventoryValue) },
            { label: 'Pending buyer cost', value: money(summary.pendingBuyerCost) },
            { label: 'Completed volume', value: money(summary.completedGrossVolume) },
            { label: 'Handling fees paid', value: money(summary.completedSellerFees) },
          ]}
        />
      </Card>

      <div style={{ height: 16 }} />
      <Grid min={320}>
        <Card title="Create private offer" meta={`${candidates.length} nearby players`}>
          {inventory.length > 0 && candidates.length > 0 ? (
            <GameActionForm
              endpoint="/api/trades"
              label="Create trade offer"
              payload={{ characterId: character.id }}
              fields={[
                {
                  name: 'recipientCharacterId',
                  label: 'Recipient',
                  type: 'select',
                  options: candidates.map((candidate) => ({
                    label: `${candidate.name} · level ${candidate.level}`,
                    value: candidate.id,
                  })),
                },
                {
                  name: 'itemKey',
                  label: 'Inventory item',
                  type: 'select',
                  options: inventory.map((item) => ({
                    label: `${item.item?.name ?? item.itemKey} (${item.quantity})`,
                    value: item.itemKey,
                  })),
                },
                { name: 'quantity', label: 'Quantity', type: 'number', defaultValue: 1, min: 1, max: 1000 },
                { name: 'priceEach', label: 'Price each', type: 'number', defaultValue: 100, min: 1, max: 1000000 },
                { name: 'expiresInHours', label: 'Expires in hours', type: 'number', defaultValue: 24, min: 1, max: 168 },
              ]}
              helper="Inventory is reserved immediately. If the offer is cancelled or expires, unsold items return to your inventory."
              successMessage="Trade offer created."
              cooldown={getActionCooldown(actionLocks, 'trade_create')}
            />
          ) : (
            <EmptyState>
              {inventory.length === 0
                ? 'You need inventory before creating a trade offer.'
                : 'No available nearby players can receive a trade offer.'}
            </EmptyState>
          )}
        </Card>

        <Card title="Received offers" meta={`${openReceived.length} open`}>
          {openReceived.length > 0 ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {openReceived.map((offer) => (
                <TradeOfferCard key={offer.id} offer={offer} characterId={character.id} direction="received" acceptCooldown={acceptCooldown} />
              ))}
            </div>
          ) : (
            <EmptyState>No open trade offers received.</EmptyState>
          )}
        </Card>
      </Grid>

      <div style={{ height: 16 }} />
      <Grid min={320}>
        <Card title="Sent offers" meta={`${openSent.length} open`}>
          {openSent.length > 0 ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {openSent.map((offer) => (
                <TradeOfferCard key={offer.id} offer={offer} characterId={character.id} direction="sent" />
              ))}
            </div>
          ) : (
            <EmptyState>No open trade offers sent.</EmptyState>
          )}
        </Card>

        <Card title="Trade history" meta={`${history.length} recent`}>
          {history.length > 0 ? (
            <div style={{ display: 'grid', gap: 12 }}>
              {history.map((offer) => (
                <TradeOfferCard
                  key={`${offer.id}-${offer.status}`}
                  offer={offer}
                  characterId={character.id}
                  direction={offer.sellerCharacterId === character.id ? 'sent' : 'received'}
                  acceptCooldown={acceptCooldown}
                />
              ))}
            </div>
          ) : (
            <EmptyState>No completed, cancelled, or expired trades yet.</EmptyState>
          )}
        </Card>
      </Grid>
    </GamePageShell>
  );
}

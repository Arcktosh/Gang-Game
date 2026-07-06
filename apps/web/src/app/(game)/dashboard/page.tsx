import {
  db,
  getCharacterStatusDetail,
  getFactionForCharacter,
  getCharacterProgressionProfile,
  getSeasonProfile,
  getPvpProfile,
  listEquipmentProfile,
  listVehicleProfile,
  listCraftingProfile,
  listContactsProfile,
  listNotificationCenter,
  listMessageCenter,
  listCharacterSafetyProfile,
  listActiveAnnouncements,
  listActiveActionLocks,
  inventoryItems,
  listActiveShopListings,
  listAssetOrders,
  listCharacterBankTransactions,
  listCharacterLoans,
  listCharacterPortfolio,
  listCharactersForUser,
  listCourses,
  listFactions,
  listFinanceMarket,
  listGamblingGames,
  getGamblingSummary,
  listContracts,
  listMarketForLocation,
  listMoneySinks,
  listNewspaperCenter,
  listShops,
  listShopsForCharacter,
  listTerritories,
  listTrainingActivities,
  refreshCharacterHeat,
  travelRoutes,
} from '@drugdeal/db';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { LogoutButton } from '@/features/auth/logout-button';
import { CharacterPanel } from '@/features/dashboard/character-panel';
import { GamePageShell } from '@/features/game/game-page';
import { getCurrentSession } from '@/lib/server-session';

const dashboardSectionItems = [
  { label: 'Overview', href: '/dashboard#dashboard-overview', icon: '▣' },
  { label: 'Actions', href: '/dashboard#dashboard-actions', icon: '▤' },
  { label: 'Messages', href: '/dashboard#dashboard-messages', icon: '✉' },
  { label: 'Activity', href: '/dashboard#dashboard-activity', icon: '◫' },
  { label: 'Economy', href: '/dashboard#dashboard-economy', icon: '↕' },
  { label: 'Progression', href: '/dashboard#dashboard-progression', icon: '◉' },
  { label: 'Crew', href: '/dashboard#dashboard-crew', icon: '⬢' },
  { label: 'News', href: '/dashboard#dashboard-news', icon: '◇' },
] as const;

export default async function DashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  const activeSession = session;
  const characters = await listCharactersForUser(activeSession.user.id);
  const refreshedActiveCharacter = characters[0]
    ? await db.transaction((tx) => refreshCharacterHeat(tx, characters[0]))
    : null;
  const panelCharacters = refreshedActiveCharacter
    ? [refreshedActiveCharacter, ...characters.slice(1)]
    : characters;
  const activeCharacter = panelCharacters[0];

  const [
    jobs,
    crimes,
    routes,
    trainingActivities,
    courses,
    market,
    inventory,
    statusDetail,
    factions,
    ownFaction,
    territories,
    shops,
    ownShops,
    shopListings,
    articles,
    financeMarket,
    portfolio,
    assetOrders,
    bankTransactions,
    loanProfile,
    gamblingGames,
    moneySinks,
    gamblingSummary,
    contracts,
    progressionProfile,
    seasonProfile,
    pvpProfile,
    equipmentProfile,
    vehicleProfile,
    craftingProfile,
    contactsProfile,
    notificationCenter,
    messageCenter,
    safetyProfile,
    announcements,
    actionLocks,
  ] = activeCharacter
    ? await Promise.all([
        db.query.jobDefinitions.findMany(),
        db.query.crimeDefinitions.findMany(),
        db.query.travelRoutes.findMany({
          where: eq(travelRoutes.fromLocation, activeCharacter.location),
        }),
        listTrainingActivities(),
        listCourses(),
        listMarketForLocation(activeCharacter.location),
        db.query.inventoryItems.findMany({
          where: eq(inventoryItems.characterId, activeCharacter.id),
        }),
        getCharacterStatusDetail(activeCharacter.id),
        listFactions(),
        getFactionForCharacter(activeCharacter.id),
        listTerritories(),
        listShops(activeCharacter.location),
        listShopsForCharacter(activeCharacter.id),
        listActiveShopListings(activeCharacter.location),
        listNewspaperCenter({
          userId: activeSession.user.id,
          characterId: activeCharacter.id,
          limit: 10,
        }),
        listFinanceMarket(),
        listCharacterPortfolio(activeCharacter.id, activeSession.user.id),
        listAssetOrders(activeCharacter.id, activeSession.user.id, 10),
        listCharacterBankTransactions({ characterId: activeCharacter.id, userId: activeSession.user.id, limit: 8 }),
        listCharacterLoans({ characterId: activeCharacter.id, userId: activeSession.user.id, limit: 8 }),
        listGamblingGames(),
        listMoneySinks(),
        getGamblingSummary(activeCharacter.id, activeSession.user.id),
        listContracts({ userId: activeSession.user.id, characterId: activeCharacter.id }),
        getCharacterProgressionProfile({
          userId: activeSession.user.id,
          characterId: activeCharacter.id,
        }),
        getSeasonProfile({ userId: activeSession.user.id, characterId: activeCharacter.id }),
        getPvpProfile({ userId: activeSession.user.id, characterId: activeCharacter.id }),
        listEquipmentProfile({ userId: activeSession.user.id, characterId: activeCharacter.id }),
        listVehicleProfile({ userId: activeSession.user.id, characterId: activeCharacter.id }),
        listCraftingProfile({ userId: activeSession.user.id, characterId: activeCharacter.id }),
        listContactsProfile({ userId: activeSession.user.id, characterId: activeCharacter.id }),
        listNotificationCenter({ userId: activeSession.user.id, characterId: activeCharacter.id }),
        listMessageCenter({ userId: activeSession.user.id, characterId: activeCharacter.id }),
        listCharacterSafetyProfile({
          userId: activeSession.user.id,
          characterId: activeCharacter.id,
        }),
        listActiveAnnouncements(),
        listActiveActionLocks(activeCharacter.id),
      ])
    : [
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        null,
        [],
        null,
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        null,
        [],
        [],
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        [],
        [],
      ];

  return (
    <GamePageShell
      title="Dashboard"
      sidebarCharacter={activeCharacter}
      sectionItems={activeCharacter ? dashboardSectionItems : undefined}
      eyebrow={`Logged in as ${activeSession.user.email}`}
      description="Command center for your character, economy, factions, messages, and progression."
      actions={
        <>
          {activeSession.user.isAdmin ? (
            <a className="button-link" href="/admin">
              Admin
            </a>
          ) : null}
          <LogoutButton />
        </>
      }
    >
      <CharacterPanel
        characters={panelCharacters}
        jobs={jobs}
        crimes={crimes}
        routes={routes}
        trainingActivities={trainingActivities}
        courses={courses}
        market={market}
        inventory={inventory}
        statusDetail={statusDetail}
        factions={factions}
        ownFaction={ownFaction}
        territories={territories}
        shops={shops}
        ownShops={ownShops}
        shopListings={shopListings}
        articles={articles}
        announcements={announcements}
        financeMarket={financeMarket}
        portfolio={portfolio ?? []}
        assetOrders={assetOrders ?? []}
        bankTransactions={bankTransactions ?? []}
        loanProfile={loanProfile}
        gamblingGames={gamblingGames}
        moneySinks={moneySinks}
        gamblingSummary={gamblingSummary}
        contracts={contracts}
        progressionProfile={progressionProfile}
        seasonProfile={seasonProfile}
        pvpProfile={pvpProfile}
        equipmentProfile={equipmentProfile}
        vehicleProfile={vehicleProfile}
        craftingProfile={craftingProfile}
        contactsProfile={contactsProfile}
        notificationCenter={notificationCenter}
        messageCenter={messageCenter}
        safetyProfile={safetyProfile}
        actionLocks={actionLocks}
      />
    </GamePageShell>
  );
}

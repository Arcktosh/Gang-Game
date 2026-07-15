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
  listCharacterProgression,
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
import { CharacterPanel, type DashboardSectionId } from '@/features/dashboard/character-panel';
import { GamePageShell } from '@/features/game/game-page';
import { getCurrentSession } from '@/lib/server-session';

const dashboardSectionConfig: Record<
  DashboardSectionId,
  { title: string; description: string }
> = {
  'dashboard-overview': {
    title: 'Dashboard overview',
    description: 'Review your active character, resources, cooldowns, and important account notices.',
  },
  'dashboard-actions': {
    title: 'Action center',
    description: 'Run jobs, crimes, training, education, travel, and recovery actions from one focused page.',
  },
  'dashboard-messages': {
    title: 'Message center',
    description: 'Start conversations, manage direct-message threads, and review social safety controls.',
  },
  'dashboard-activity': {
    title: 'Activity center',
    description: 'Review notifications, filters, preferences, unread alerts, digests, and recent activity.',
  },
  'dashboard-economy': {
    title: 'Economy center',
    description: 'Manage shops, banking, loans, investments, gambling, contracts, and economy services.',
  },
  'dashboard-progression': {
    title: 'Progression center',
    description: 'Manage objectives, seasons, crafting, vehicles, equipment, contacts, and long-term growth.',
  },
  'dashboard-crew': {
    title: 'Crew center',
    description: 'Manage faction activity, territory operations, PvP, bounties, and crew relationships.',
  },
  'dashboard-news': {
    title: 'News center',
    description: 'Publish and review player newspaper activity.',
  },
};

export async function DashboardSectionPage({ section }: { section: DashboardSectionId }) {
  const config = dashboardSectionConfig[section];
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

  if (!activeCharacter) {
    redirect('/create-character');
  }

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
    characterProgression,
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
        listCharacterProgression(activeCharacter.id),
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
        { training: [], courses: [], queue: { activeTraining: 0, activeCourses: 0, overdueCompletions: 0, nextDueAt: null } },
      ];

  return (
    <GamePageShell
      title={config.title}
      sidebarCharacter={activeCharacter}
      eyebrow={`Logged in as ${activeSession.user.email}`}
      description={config.description}
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
        activeSection={section}
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
        characterProgression={characterProgression}
      />
    </GamePageShell>
  );
}

import { startMarketTick } from './ticks/market-tick';
import { startResourceTick } from './ticks/resource-tick';
import { startTravelTick } from './ticks/travel-tick';
import { startStatusReleaseTick } from './ticks/status-release-tick';
import { startHeatTick } from './ticks/heat-tick';
import { startTerritoryIncomeTick } from './ticks/territory-income-tick';
import { startFinanceTick } from './ticks/finance-tick';
import { startContractTick } from './ticks/contract-tick';
import { startSeasonTick } from './ticks/season-tick';
import { startPvpTick } from './ticks/pvp-tick';
import { startCraftingTick } from './ticks/crafting-tick';
import { startContactsTick } from './ticks/contacts-tick';
import { startNotificationsTick } from './ticks/notifications-tick';
import { startEnforcementExpiryTick } from './ticks/enforcement-expiry-tick';
import { startMaintenanceTick } from './ticks/maintenance-tick';
import { startLoanTick } from './ticks/loan-tick';
import { startTradeTick } from './ticks/trade-tick';
import { startProgressionTick } from './ticks/progression-tick';
import { startAnomalyTick } from './ticks/anomaly-tick';

async function main() {
  console.log('worker starting');
  startMarketTick();
  startResourceTick();
  startTravelTick();
  startStatusReleaseTick();
  startHeatTick();
  startTerritoryIncomeTick();
  startFinanceTick();
  startContractTick();
  startSeasonTick();
  startPvpTick();
  startCraftingTick();
  startContactsTick();
  startNotificationsTick();
  startEnforcementExpiryTick();
  startMaintenanceTick();
  startLoanTick();
  startTradeTick();
  startProgressionTick();
  startAnomalyTick();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import { startAnomalyTick } from './ticks/anomaly-tick';
import { startContactsTick } from './ticks/contacts-tick';
import { startContractTick } from './ticks/contract-tick';
import { startCraftingTick } from './ticks/crafting-tick';
import { startEnforcementExpiryTick } from './ticks/enforcement-expiry-tick';
import { startFinanceTick } from './ticks/finance-tick';
import { startHeatTick } from './ticks/heat-tick';
import { startLoanTick } from './ticks/loan-tick';
import { startMaintenanceTick } from './ticks/maintenance-tick';
import { startMarketTick } from './ticks/market-tick';
import { startNotificationsTick } from './ticks/notifications-tick';
import { startProgressionTick } from './ticks/progression-tick';
import { startPvpTick } from './ticks/pvp-tick';
import { startResourceTick } from './ticks/resource-tick';
import { startSeasonTick } from './ticks/season-tick';
import { startStatusReleaseTick } from './ticks/status-release-tick';
import { startTerritoryIncomeTick } from './ticks/territory-income-tick';
import { startTradeTick } from './ticks/trade-tick';
import { startTravelTick } from './ticks/travel-tick';
import { workerRuntimeDiagnostics, workerTelemetry } from './observability';

const timers: NodeJS.Timeout[] = [];
let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  workerTelemetry.info('worker.shutdown.started', { context: { signal, activeTimers: timers.length } });
  for (const timer of timers) clearInterval(timer);
  workerTelemetry.info('worker.shutdown.completed', { context: { signal } });
  process.exit(0);
}

async function main() {
  workerTelemetry.info('worker.started', { context: workerRuntimeDiagnostics() });
  const notificationTimers = startNotificationsTick();
  timers.push(
    startMarketTick(),
    startResourceTick(),
    startTravelTick(),
    startStatusReleaseTick(),
    startHeatTick(),
    startTerritoryIncomeTick(),
    startFinanceTick(),
    startContractTick(),
    startSeasonTick(),
    startPvpTick(),
    startCraftingTick(),
    startContactsTick(),
    ...notificationTimers,
    startEnforcementExpiryTick(),
    startMaintenanceTick(),
    startLoanTick(),
    startTradeTick(),
    startProgressionTick(),
    startAnomalyTick(),
  );
}

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

main().catch((error) => {
  workerTelemetry.error('worker.start_failed', { context: { error } });
  workerTelemetry.alert('critical', 'worker.start_failed', 'The worker process failed during startup.', { context: { error } });
  process.exit(1);
});

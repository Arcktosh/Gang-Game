import { runOperationalAnomalyScan } from '@drugdeal/db';
import { normalizeOperationalAnomalyThresholds } from '@drugdeal/game';
import { scheduleWorkerTick } from '../tick-runner';

const DEFAULT_ANOMALY_TICK_MS = positiveIntegerOrDefault(Number(process.env.ANOMALY_SCAN_TICK_MS), 30 * 60 * 1000);

function positiveIntegerOrDefault(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function anomalyThresholdsFromEnv() {
  return normalizeOperationalAnomalyThresholds({
    highNetWorth: Number(process.env.ANOMALY_HIGH_NET_WORTH),
    transactionVolume: Number(process.env.ANOMALY_TRANSACTION_VOLUME),
    transactionCount: Number(process.env.ANOMALY_TRANSACTION_COUNT),
    inventoryQuantity: Number(process.env.ANOMALY_INVENTORY_QUANTITY),
    sessionIpCount: Number(process.env.ANOMALY_SESSION_IP_COUNT),
    scanWindowHours: Number(process.env.ANOMALY_SCAN_WINDOW_HOURS),
  });
}

export function startAnomalyTick(intervalMs = DEFAULT_ANOMALY_TICK_MS) {
  const thresholds = anomalyThresholdsFromEnv();

  return scheduleWorkerTick({
    name: 'operational-anomaly-scan',
    intervalMs,
    runImmediately: true,
    deadLetterPayload: { thresholds },
    run: async () => {
      const result = await runOperationalAnomalyScan({ thresholds });

      if (result.candidates > 0) {
        console.warn('operational anomaly scan found candidates', {
          bucket: result.bucket,
          candidates: result.candidates,
          anomalies: result.anomalies.length,
        });
      }
    },
  });
}

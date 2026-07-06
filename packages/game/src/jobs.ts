export type JobPayoutInput = { baseWage: number; labour: number };

export function calculateJobPayout(input: JobPayoutInput): number {
  const labourMultiplier = 1 + input.labour * 0.05;
  return Math.floor(input.baseWage * labourMultiplier);
}

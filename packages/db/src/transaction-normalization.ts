export function normalizeNonNegativeInteger(value: number) {
  return Math.max(0, Math.floor(value));
}

export function normalizePositiveInteger(value: number) {
  return Math.max(1, Math.floor(value));
}

export function normalizeInteger(value: number) {
  return Math.floor(value);
}

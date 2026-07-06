export type DateInput = string | Date | null | undefined;

function toValidDate(value: DateInput): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function formatDateOnly(value: DateInput, fallback = 'None'): string {
  const date = toValidDate(value);

  if (!date) {
    return fallback;
  }

  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function formatDateTime(value: DateInput, fallback = 'None'): string {
  const date = toValidDate(value);

  if (!date) {
    return fallback;
  }

  return `${formatDateOnly(date)} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} UTC`;
}

export function formatMoney(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount)) {
    return '$0';
  }

  return `$${amount.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

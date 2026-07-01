export type WithdrawalTransaction = {
  id: string;
  reference: string;
  appliedDate: string;
  amount: string;
  numericAmount: number;
  createdAt: string;
  workflowState?: unknown;
};

export function hasDataObject(value: unknown) {
  return Boolean(value && typeof value === 'object' && Object.keys(value as Record<string, unknown>).length > 0);
}

export function decodeJwtPayload(token: string) {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join('')
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function formatCurrency(value?: unknown) {
  const numericValue =
    typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (Number.isNaN(numericValue)) return 'Rs. 0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  })
    .format(numericValue)
    .replace('₹', 'Rs. ');
}

export function formatAppliedDate(value?: unknown) {
  if (typeof value !== 'string' || value.trim() === '') return 'Date not available';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function truncateReference(value?: unknown, maxLength = 15) {
  const text = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
  if (!text) return 'Request';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export function parseNumericValue(value?: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string' && value.trim() !== '') {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : 0;
  }
  return 0;
}

export function formatAxisAmount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '0';
  return new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function formatChartDate(value?: unknown) {
  if (typeof value !== 'string' || value.trim() === '') return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function normalizeWorkflowState(value?: unknown) {
  if (typeof value === 'string') return value.toUpperCase();
  if (value && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
    const raw = (value as Record<string, unknown>).value;
    return typeof raw === 'string' ? raw.toUpperCase() : '';
  }
  return '';
}

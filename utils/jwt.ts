export interface JwtPayload {
  sub?: string;
  email?: string;
  preferred_username?: string;
  name?: string;
  groups?: string[];
  roles?: string[];
  realm_access?: { roles: string[] };
  resource_access?: Record<string, { roles: string[] }>;
  org?: string;
  employeeId?: string;
  exp?: number;
  iat?: number;
  iss?: string;
  aud?: string | string[];
  [key: string]: unknown;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

    const decoded =
      typeof atob !== 'undefined'
        ? atob(padded)
        : Buffer.from(padded, 'base64').toString('utf-8');

    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

const ENTITLEMENT_PATTERNS = ['ECT-CLMS', 'ECT-CHT'];

export function extractEntitlementRole(payload: JwtPayload): string | null {
  const all: string[] = [
    ...(payload.groups ?? []),
    ...(payload.roles ?? []),
    ...(payload.realm_access?.roles ?? []),
  ];

  return (
    all.find((r) => {
      const upper = String(r).toUpperCase();
      return ENTITLEMENT_PATTERNS.some((p) => upper.includes(p));
    }) ?? all[0] ?? null
  );
}

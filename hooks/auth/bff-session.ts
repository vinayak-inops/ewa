import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BFF_BASE = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/+$/, '');
const USER_PROFILE_KEY = 'ewa_bff_user_profile';

let csrfToken: string | null = null;
// Stored cookie value for React Native (browser handles cookies automatically via credentials:include)
let xsrfCookieValue: string | null = null;
// Session cookie for React Native
let sessionCookieHeader: string | null = null;

export type BffUserProfile = {
  username: string;
  name: string;
  email: string;
  tenantCode: string;
  roles: string[];
};

export function getCsrfToken() { return csrfToken; }
export function clearCsrfToken() { csrfToken = null; }

/** Fetch CSRF only if not already in memory (safe to call before any POST). */
export async function ensureCsrf(): Promise<string> {
  if (csrfToken) return csrfToken;
  return fetchCsrf();
}

/** Extract a named cookie value from a Set-Cookie header string */
function extractCookie(setCookieHeader: string | null, name: string): string | null {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(new RegExp(`(?:^|,)\\s*${name}=([^;,]+)`));
  return match ? match[1] : null;
}

export async function fetchCsrf(): Promise<string> {
  console.log('[BFF] fetchCsrf → GET', `${BFF_BASE}/bff/csrf`);
  const res = await fetch(`${BFF_BASE}/bff/csrf`, { credentials: 'include' });
  console.log('[BFF] fetchCsrf ← status:', res.status);
  if (!res.ok) throw new Error(`CSRF fetch failed (${res.status})`);

  // React Native: extract XSRF-TOKEN cookie from Set-Cookie for manual forwarding
  if (Platform.OS !== 'web') {
    const setCookie = res.headers.get('set-cookie');
    console.log('[BFF] fetchCsrf set-cookie header:', setCookie);
    const extracted = extractCookie(setCookie, 'XSRF-TOKEN');
    if (extracted) xsrfCookieValue = extracted;
    console.log('[BFF] fetchCsrf xsrfCookieValue:', xsrfCookieValue);
  }

  const data = (await res.json()) as { csrfToken: string };
  csrfToken = data.csrfToken;
  console.log('[BFF] fetchCsrf csrfToken:', csrfToken);
  return csrfToken;
}

/** Build Cookie header string for React Native requests */
function buildCookieHeader(extra?: string): Record<string, string> {
  if (Platform.OS === 'web') return {}; // browser manages cookies automatically
  const parts: string[] = [];
  if (xsrfCookieValue) parts.push(`XSRF-TOKEN=${xsrfCookieValue}`);
  if (sessionCookieHeader) parts.push(sessionCookieHeader);
  if (extra) parts.push(extra);
  return parts.length ? { Cookie: parts.join('; ') } : {};
}

export async function bffLogin(username: string, password: string): Promise<BffUserProfile> {
  if (!csrfToken) await fetchCsrf();

  const requestHeaders = {
    'Content-Type': 'application/json',
    'X-XSRF-TOKEN': csrfToken!,
    ...buildCookieHeader(),
  };
  console.log('[BFF] bffLogin → POST', `${BFF_BASE}/bff/login`);
  console.log('[BFF] bffLogin request headers:', requestHeaders);
  console.log('[BFF] bffLogin request body:', { username, password: '***' });

  const res = await fetch(`${BFF_BASE}/bff/login`, {
    method: 'POST',
    credentials: 'include',
    headers: requestHeaders,
    body: JSON.stringify({ username, password }),
  });

  console.log('[BFF] bffLogin ← status:', res.status);
  console.log('[BFF] bffLogin ← headers:', Object.fromEntries(res.headers.entries()));

  if (!res.ok) {
    let msg = `Login failed (${res.status})`;
    try { const t = await res.text(); if (t) { console.log('[BFF] bffLogin error body:', t); msg = t; } } catch { /* ignore */ }
    throw new Error(msg);
  }

  // React Native: capture SESSION cookie for subsequent authenticated requests
  if (Platform.OS !== 'web') {
    const setCookie = res.headers.get('set-cookie');
    console.log('[BFF] bffLogin set-cookie:', setCookie);
    const session = extractCookie(setCookie, 'SESSION');
    if (session) sessionCookieHeader = `SESSION=${session}`;
    console.log('[BFF] bffLogin sessionCookieHeader:', sessionCookieHeader);
  }

  const profile = (await res.json()) as BffUserProfile;
  console.log('[BFF] bffLogin success profile:', profile);
  await saveBffUserProfile(profile);
  return profile;
}

export async function bffGetUser(): Promise<BffUserProfile | null> {
  try {
    const res = await fetch(`${BFF_BASE}/bff/user`, {
      credentials: 'include',
      headers: { ...buildCookieHeader() },
    });
    if (!res.ok) return null;
    return (await res.json()) as BffUserProfile;
  } catch {
    return null;
  }
}

export async function bffLogout(): Promise<void> {
  if (!csrfToken) {
    try { await fetchCsrf(); } catch { /* best effort */ }
  }
  try {
    await fetch(`${BFF_BASE}/bff/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}),
        ...buildCookieHeader(),
      },
    });
  } finally {
    csrfToken = null;
    xsrfCookieValue = null;
    sessionCookieHeader = null;
    await clearBffUserProfile();
  }
}

/** Returns Cookie headers for authenticated API requests on React Native */
export function getSessionCookieHeaders(): Record<string, string> {
  return buildCookieHeader();
}

async function storeItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function loadItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function removeItem(key: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function saveBffUserProfile(profile: BffUserProfile) {
  await storeItem(USER_PROFILE_KEY, JSON.stringify(profile));
}

export async function getBffUserProfile(): Promise<BffUserProfile | null> {
  try {
    const raw = await loadItem(USER_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BffUserProfile;
  } catch {
    return null;
  }
}

export async function clearBffUserProfile() {
  await removeItem(USER_PROFILE_KEY);
}


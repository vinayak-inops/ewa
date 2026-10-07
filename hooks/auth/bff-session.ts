import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BFF_BASE = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/+$/, '');
const USER_PROFILE_KEY   = 'ewa_bff_user_profile';
const SESSION_COOKIE_KEY = 'ewa_bff_session_cookie';
const XSRF_COOKIE_KEY    = 'ewa_bff_xsrf_cookie';
const CSRF_TOKEN_KEY     = 'ewa_bff_csrf_token';

let csrfToken: string | null = null;
// Stored cookie value for React Native (browser handles cookies automatically via credentials:include)
let xsrfCookieValue: string | null = null;
// Session cookie for React Native
let sessionCookieHeader: string | null = null;

let sessionLoaded = false;
let sessionLoadingPromise: Promise<void> | null = null;

export type BffUserProfile = {
  username: string;
  name: string;
  email: string;
  tenantCode: string;
  roles: string[];
};

export function getCsrfToken() { return csrfToken; }
export function clearCsrfToken() { csrfToken = null; }

/** Load stored session credentials from persistent SecureStore into memory */
export async function ensureSessionLoaded(): Promise<void> {
  if (sessionLoaded) return;
  if (!sessionLoadingPromise) {
    sessionLoadingPromise = (async () => {
      try {
        const [storedSession, storedXsrf, storedCsrf] = await Promise.all([
          loadItem(SESSION_COOKIE_KEY),
          loadItem(XSRF_COOKIE_KEY),
          loadItem(CSRF_TOKEN_KEY),
        ]);
        if (storedSession && !sessionCookieHeader) sessionCookieHeader = storedSession;
        if (storedXsrf && !xsrfCookieValue) xsrfCookieValue = storedXsrf;
        if (storedCsrf && !csrfToken) csrfToken = storedCsrf;
      } catch (err) {
        console.warn('[BFF] Error loading stored session from SecureStore:', err);
      } finally {
        sessionLoaded = true;
      }
    })();
  }
  await sessionLoadingPromise;
}

// Pre-load on module import so it's ready as early as possible
void ensureSessionLoaded();

/** Extract a named cookie value from a Set-Cookie header string */
function extractCookie(setCookieHeader: string | null, name: string): string | null {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(new RegExp(`(?:^|[,;])\\s*${name}=([^;,]+)`));
  return match ? match[1] : null;
}

/** Updates in-memory cookies and persists them to SecureStore whenever Set-Cookie is received */
export async function updateCookiesFromResponse(res: Response): Promise<void> {
  if (Platform.OS === 'web') return;
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return;

  const session = extractCookie(setCookie, 'SESSION');
  if (session) {
    sessionCookieHeader = `SESSION=${session}`;
    await storeItem(SESSION_COOKIE_KEY, sessionCookieHeader);
    console.log('[BFF] Updated sessionCookieHeader from Set-Cookie:', sessionCookieHeader);
  }

  const xsrf = extractCookie(setCookie, 'XSRF-TOKEN');
  if (xsrf) {
    xsrfCookieValue = xsrf;
    await storeItem(XSRF_COOKIE_KEY, xsrfCookieValue);
    console.log('[BFF] Updated xsrfCookieValue from Set-Cookie:', xsrfCookieValue);
  }
}

/** Fetch CSRF only if not already in memory (safe to call before any POST). */
export async function ensureCsrf(): Promise<string> {
  await ensureSessionLoaded();
  if (csrfToken) return csrfToken;
  return fetchCsrf();
}

export async function fetchCsrf(): Promise<string> {
  await ensureSessionLoaded();
  console.log('[BFF] fetchCsrf → GET', `${BFF_BASE}/bff/csrf`);
  const res = await fetch(`${BFF_BASE}/bff/csrf`, {
    credentials: 'include',
    headers: { ...buildCookieHeader() },
  });
  console.log('[BFF] fetchCsrf ← status:', res.status);
  if (!res.ok) throw new Error(`CSRF fetch failed (${res.status})`);

  // React Native: extract and persist XSRF-TOKEN and SESSION cookies from Set-Cookie
  if (Platform.OS !== 'web') {
    await updateCookiesFromResponse(res);
  }

  const data = (await res.json()) as { csrfToken: string };
  csrfToken = data.csrfToken;
  await storeItem(CSRF_TOKEN_KEY, csrfToken);
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
  await ensureSessionLoaded();
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

  // React Native: capture and persist SESSION and XSRF-TOKEN cookies
  if (Platform.OS !== 'web') {
    await updateCookiesFromResponse(res);
  }

  const profile = (await res.json()) as BffUserProfile;
  console.log('[BFF] bffLogin success profile:', profile);
  await saveBffUserProfile(profile);
  return profile;
}

export async function bffGetUser(): Promise<BffUserProfile | null> {
  try {
    await ensureSessionLoaded();
    const res = await fetch(`${BFF_BASE}/bff/user`, {
      credentials: 'include',
      headers: { ...buildCookieHeader() },
    });
    if (!res.ok) return null;
    if (Platform.OS !== 'web') {
      await updateCookiesFromResponse(res);
    }
    const profile = (await res.json()) as BffUserProfile;
    await saveBffUserProfile(profile);
    return profile;
  } catch {
    return null;
  }
}

export async function bffLogout(): Promise<void> {
  await ensureSessionLoaded();
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
  } catch (err) {
    console.warn('[BFF] Logout network request error (proceeding with local wipe):', err);
  } finally {
    await clearBffSession();
  }
}

/** Returns Cookie headers for authenticated API requests on React Native */
export function getSessionCookieHeaders(): Record<string, string> {
  return buildCookieHeader();
}

/** Returns true if a session is present (either in-memory or persisted in SecureStore) */
export async function hasActiveSession(): Promise<boolean> {
  await ensureSessionLoaded();
  if (Platform.OS === 'web') {
    const profile = await getBffUserProfile();
    return Boolean(profile);
  }
  return Boolean(sessionCookieHeader);
}

async function storeItem(key: string, value: string) {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch (err) {
    console.warn(`[BFF] storeItem error for ${key}:`, err);
  }
}

async function loadItem(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return null;
      return window.localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch (err) {
    console.warn(`[BFF] loadItem error for ${key}:`, err);
    return null;
  }
}

async function removeItem(key: string) {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.localStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  } catch (err) {
    console.warn(`[BFF] removeItem error for ${key}:`, err);
  }
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

/** Wipes all BFF session cookies, CSRF tokens, and user profiles from memory and SecureStore */
export async function clearBffSession(): Promise<void> {
  csrfToken = null;
  xsrfCookieValue = null;
  sessionCookieHeader = null;
  sessionLoaded = false;
  sessionLoadingPromise = null;
  await Promise.all([
    removeItem(USER_PROFILE_KEY),
    removeItem(SESSION_COOKIE_KEY),
    removeItem(XSRF_COOKIE_KEY),
    removeItem(CSRF_TOKEN_KEY),
  ]);
}

export async function clearBffUserProfile(): Promise<void> {
  await clearBffSession();
}



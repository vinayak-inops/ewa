import { Platform } from 'react-native';

import { bffLogout, clearBffUserProfile, ensureCsrf, getSessionCookieHeaders } from '@/hooks/auth/bff-session';
import { clearBiometricSession } from '@/hooks/auth/biometric-session';
import { emitSessionExpired } from '@/hooks/auth/session-events';
import { clearAuthTokens } from '@/hooks/auth/token-store';

function getLoginRedirectUrl() {
  const baseUrl = (process.env.EXPO_PUBLIC_NEXTAUTH_URL ?? '').trim();
  if (baseUrl) return `${baseUrl.replace(/\/+$/, '')}/login`;
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.origin}/login`;
  return '/login';
}

export async function handleUnauthorized() {
  // Fire BFF logout in background to invalidate the server session,
  // then clear all local state regardless of whether the server call succeeds.
  bffLogout().catch(() => {});

  await Promise.all([clearAuthTokens(), clearBffUserProfile(), clearBiometricSession()]);

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.location.assign(getLoginRedirectUrl());
  } else {
    emitSessionExpired();
  }
}

/**
 * Drop-in replacement for fetch() for authenticated API calls.
 * - Automatically attaches CSRF token and session cookies.
 * - On 401 or 403: clears session and redirects to login.
 */
export async function authedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const method = (options.method ?? 'GET').toUpperCase();

  const extraHeaders: Record<string, string> = {
    ...getSessionCookieHeaders(),
  };

  if (method !== 'GET') {
    extraHeaders['X-XSRF-TOKEN'] = await ensureCsrf();
  }

  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      ...extraHeaders,
      ...(options.headers as Record<string, string> ?? {}),
    },
  });

  if (response.status === 401 || response.status === 403) {
    await handleUnauthorized();
  }

  return response;
}

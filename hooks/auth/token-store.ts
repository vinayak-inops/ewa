import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'ewa_access_token';
const REFRESH_TOKEN_KEY = 'ewa_refresh_token';
const TOKEN_TYPE_KEY = 'ewa_token_type';
const EXPIRES_AT_KEY = 'ewa_expires_at';

type StoredTokenPayload = {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
};

let accessTokenMemory: string | null = null;

async function setItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string) {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export async function saveAuthTokens(payload: StoredTokenPayload) {
  const tokenType = payload.tokenType ?? 'Bearer';
  const expiresAt = payload.expiresIn ? String(Date.now() + payload.expiresIn * 1000) : '';

  accessTokenMemory = payload.accessToken;

  await setItem(ACCESS_TOKEN_KEY, payload.accessToken);
  await setItem(TOKEN_TYPE_KEY, tokenType);

  if (expiresAt) {
    await setItem(EXPIRES_AT_KEY, expiresAt);
  } else {
    await deleteItem(EXPIRES_AT_KEY);
  }

  if (payload.refreshToken) {
    await setItem(REFRESH_TOKEN_KEY, payload.refreshToken);
  } else {
    await deleteItem(REFRESH_TOKEN_KEY);
  }

  if (__DEV__) {
    console.log('[token-store] token saved', {
      hasAccessToken: Boolean(payload.accessToken),
      hasRefreshToken: Boolean(payload.refreshToken),
      tokenType,
      hasExpiresAt: Boolean(expiresAt),
    });
  }
}

export async function clearAuthTokens() {
  accessTokenMemory = null;
  await Promise.all([
    deleteItem(ACCESS_TOKEN_KEY),
    deleteItem(REFRESH_TOKEN_KEY),
    deleteItem(TOKEN_TYPE_KEY),
    deleteItem(EXPIRES_AT_KEY),
  ]);
  if (__DEV__) {
    console.log('[token-store] tokens cleared');
  }
}

export async function getAccessToken() {
  if (accessTokenMemory) return accessTokenMemory;
  const stored = await getItem(ACCESS_TOKEN_KEY);
  accessTokenMemory = stored ?? null;
  if (__DEV__) {
    console.log('[token-store] getAccessToken', { found: Boolean(accessTokenMemory) });
  }
  return accessTokenMemory;
}

export async function getAuthHeader() {
  const token = await getAccessToken();
  if (!token) {
    if (__DEV__) {
      console.log('[token-store] getAuthHeader -> null (no token)');
    }
    return null;
  }
  const tokenType = (await getItem(TOKEN_TYPE_KEY)) ?? 'Bearer';
  const header = `${tokenType} ${token}`;
  if (__DEV__) {
    console.log('[token-store] getAuthHeader -> built', { tokenType, tokenLength: token.length });
  }
  return header;
}

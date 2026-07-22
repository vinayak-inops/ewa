import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const ACCESS_TOKEN_KEY = 'ewa_access_token';
const REFRESH_TOKEN_KEY = 'ewa_refresh_token';
const ID_TOKEN_KEY = 'ewa_id_token';
const TOKEN_TYPE_KEY = 'ewa_token_type';
const EXPIRES_AT_KEY = 'ewa_expires_at';

type StoredTokenPayload = {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  tokenType?: string;
  expiresIn?: number;
};

let accessTokenMemory: string | null = null;
let idTokenMemory: string | null = null;

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
  idTokenMemory = payload.idToken ?? null;

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

  if (payload.idToken) {
    await setItem(ID_TOKEN_KEY, payload.idToken);
  } else {
    await deleteItem(ID_TOKEN_KEY);
  }
}

export async function clearAuthTokens() {
  accessTokenMemory = null;
  idTokenMemory = null;
  await Promise.all([
    deleteItem(ACCESS_TOKEN_KEY),
    deleteItem(REFRESH_TOKEN_KEY),
    deleteItem(ID_TOKEN_KEY),
    deleteItem(TOKEN_TYPE_KEY),
    deleteItem(EXPIRES_AT_KEY),
  ]);
}

export async function getAccessToken() {
  const expiresAtRaw = await getItem(EXPIRES_AT_KEY);
  const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : NaN;
  if (Number.isFinite(expiresAt) && Date.now() >= expiresAt) {
    await clearAuthTokens();
    return null;
  }

  if (accessTokenMemory) return accessTokenMemory;
  const stored = await getItem(ACCESS_TOKEN_KEY);
  accessTokenMemory = stored ?? null;
  
  return accessTokenMemory;
}

export async function getRefreshToken() {
  return getItem(REFRESH_TOKEN_KEY);
}

export async function getIdToken() {
  if (idTokenMemory) return idTokenMemory;
  const stored = await getItem(ID_TOKEN_KEY);
  idTokenMemory = stored ?? null;
  
  return idTokenMemory;
}

export async function getAuthHeader() {
  const token = await getAccessToken();
  if (!token) {
    return null;
  }
  const tokenType = (await getItem(TOKEN_TYPE_KEY)) ?? 'Bearer';
  const header = `${tokenType} ${token}`;
 
  return header;
}

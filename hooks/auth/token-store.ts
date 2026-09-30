import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { getBffUserProfile, makeSyntheticToken } from './bff-session';

// Keys kept only for clearing any legacy tokens stored by older app versions.
const ACCESS_TOKEN_KEY  = 'ewa_access_token';
const REFRESH_TOKEN_KEY = 'ewa_refresh_token';
const ID_TOKEN_KEY      = 'ewa_id_token';
const TOKEN_TYPE_KEY    = 'ewa_token_type';
const EXPIRES_AT_KEY    = 'ewa_expires_at';

async function deleteItem(key: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

/** Clear any previously stored tokens (legacy Keycloak or synthetic tokens). */
export async function clearAuthTokens() {
  await Promise.all([
    deleteItem(ACCESS_TOKEN_KEY),
    deleteItem(REFRESH_TOKEN_KEY),
    deleteItem(ID_TOKEN_KEY),
    deleteItem(TOKEN_TYPE_KEY),
    deleteItem(EXPIRES_AT_KEY),
  ]);
}

/**
 * Returns a synthetic decodable token derived from the stored BFF user profile.
 * Callers that decode the JWT payload (for employeeID / tenantCode) continue to
 * work without change. The token is never written to storage — it is generated
 * on demand from the BFF profile, and the BFF SESSION cookie is the actual
 * authentication credential for every API request.
 */
export async function getAccessToken(): Promise<string | null> {
  const profile = await getBffUserProfile();
  if (!profile) return null;
  return makeSyntheticToken(profile);
}

/** No-op — the BFF session cookie is the auth credential; no token is stored. */
export async function saveAuthTokens(_payload: unknown): Promise<void> {}

export async function getRefreshToken(): Promise<string | null> {
  return null;
}

export async function getIdToken(): Promise<string | null> {
  return null;
}

export async function getAuthHeader(): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) return null;
  return `Bearer ${token}`;
}

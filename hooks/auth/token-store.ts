import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

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

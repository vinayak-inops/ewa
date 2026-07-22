import { clearAuthTokens, getRefreshToken, saveAuthTokens } from './token-store';

const RAW = process.env.EXPO_PUBLIC_KEYCLOAK_AUTH_URL ?? process.env.EXPO_PUBLIC_KEYCLOAK_ISSUER ?? '';
const ISSUER = RAW.includes('/protocol/openid-connect') ? RAW.split('/protocol/openid-connect')[0] : RAW;
const TOKEN_URL = ISSUER ? `${ISSUER}/protocol/openid-connect/token` : '';
const CLIENT_ID = process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.EXPO_PUBLIC_KEYCLOAK_CLIENT_SECRET ?? '';

/**
 * Silently refreshes the access token using the stored refresh token.
 * Returns the new access token on success, or null if the refresh token
 * is missing/expired (caller should then force Keycloak re-login).
 */
export async function refreshAccessToken(): Promise<string | null> {
  if (!TOKEN_URL || !CLIENT_ID) return null;

  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  try {
    const params: Record<string, string> = {
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      refresh_token: refreshToken,
    };
    if (CLIENT_SECRET) params.client_secret = CLIENT_SECRET;

    const body = Object.entries(params)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!res.ok) {
      await clearAuthTokens();
      return null;
    }

    const json = (await res.json()) as Record<string, unknown>;
    const newAccessToken = typeof json.access_token === 'string' ? json.access_token : null;
    if (!newAccessToken) {
      await clearAuthTokens();
      return null;
    }

    await saveAuthTokens({
      accessToken: newAccessToken,
      refreshToken: typeof json.refresh_token === 'string' ? json.refresh_token : undefined,
      idToken: typeof json.id_token === 'string' ? json.id_token : undefined,
      tokenType: typeof json.token_type === 'string' ? json.token_type : undefined,
      expiresIn: typeof json.expires_in === 'number' ? json.expires_in : undefined,
    });

    return newAccessToken;
  } catch {
    return null;
  }
}

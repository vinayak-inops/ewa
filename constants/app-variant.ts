export type AppVariant = 'lite' | 'rich';

const rawVariant = (process.env.EXPO_PUBLIC_APP_VARIANT ?? '').trim().toLowerCase();

export const APP_VARIANT: AppVariant = rawVariant === 'rich' ? 'rich' : 'lite';
export const IS_LITE = APP_VARIANT === 'lite';
export const IS_RICH = APP_VARIANT === 'rich';

export function getPostLoginRoute() {
  return IS_RICH ? '/(tabs-rich)' : '/(tabs-lite)';
}

import { useSelector } from 'react-redux';
import { RootState } from '@/store';

export type PermissionsMap = Record<string, boolean>;

const toTruePermissions = (raw: unknown): PermissionsMap | null => {
  if (!raw || typeof raw !== 'object') return null;
  const out: PermissionsMap = {};
  Object.entries(raw as Record<string, unknown>).forEach(([k, v]) => {
    if (v === true) out[k] = true;
  });
  return Object.keys(out).length > 0 ? out : null;
};

export function useScreenPermissions(serviceName: string, screenName: string): PermissionsMap | null {
  const permissions = useSelector((s: RootState) => s.role.permissions);
  if (!permissions || permissions.length === 0) return null;

  const roleData = permissions[0] as Record<string, unknown>;

  // Object schema: roleData[serviceName][screenName] = { permissions, isActive }
  const service = roleData[serviceName];
  if (service && typeof service === 'object' && !Array.isArray(service)) {
    const screen = (service as Record<string, unknown>)[screenName];
    if (screen && typeof screen === 'object') {
      const s = screen as Record<string, unknown>;
      if (s.isActive !== false && s.enabled !== false) {
        const p = toTruePermissions(s.permissions);
        if (p) return p;
      }
    }
  }

  // Array schema: roleData[serviceName] = [{ screenName, permissions, isActive }]
  if (Array.isArray(service)) {
    const match = (service as Record<string, unknown>[]).find(
      (s) => s.screenName === screenName && s.isActive !== false && s.enabled !== false
    );
    const p = toTruePermissions(match?.permissions);
    if (p) return p;
  }

  // Fallback: screenPermissions array schema
  if (Array.isArray(roleData.screenPermissions)) {
    const svc = (roleData.screenPermissions as Record<string, unknown>[]).find(
      (s) => s.serviceName === serviceName
    );
    if (svc && Array.isArray(svc.screens)) {
      const scr = (svc.screens as Record<string, unknown>[]).find(
        (s) => s.screenName === screenName
      );
      return toTruePermissions(scr?.permissions);
    }
  }

  return null;
}

/** Returns true if the user has any relevant permission on the given screen. */
export function useCanAccess(serviceName: string, screenName: string): boolean {
  const p = useScreenPermissions(serviceName, screenName);
  return p !== null && Object.keys(p).length > 0;
}

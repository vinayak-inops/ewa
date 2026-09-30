import { useRolePermissions } from '@/hooks/api/useRolePermissions';
import type { RootState } from '@/store';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

export type ScreenVisibility = {
  ewa: boolean;
  applications: boolean;
  attendance: boolean;
};

function hasActiveScreen(service: unknown): boolean {
  if (!service || typeof service !== 'object') return false;
  if (Array.isArray(service)) {
    return service.some((s) => s.isActive !== false && s.enabled !== false);
  }
  return Object.values(service as Record<string, unknown>).some((screen) => {
    if (!screen || typeof screen !== 'object') return false;
    const s = screen as Record<string, unknown>;
    return s.isActive !== false && s.enabled !== false;
  });
}

export function useScreenVisibility(): ScreenVisibility {
  const { loading } = useRolePermissions();
  const permissions = useSelector((s: RootState) => s.role.permissions);

  return useMemo(() => {
    if (loading) return { ewa: true, applications: true, attendance: true };
    if (!permissions || permissions.length === 0) return { ewa: false, applications: false, attendance: false };

    const roleData = permissions[0] as Record<string, unknown>;

    return {
      ewa: hasActiveScreen(roleData.ewa),
      applications: hasActiveScreen(roleData.applicationApplier) || hasActiveScreen(roleData.applicationApprover),
      attendance: hasActiveScreen(roleData.attendance) || hasActiveScreen(roleData.muster),
    };
  }, [permissions, loading]);
}

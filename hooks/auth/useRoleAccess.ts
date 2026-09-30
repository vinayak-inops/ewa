import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { initializeRoleFromBffProfile, clearRole, RoleState } from '@/store/slices/roleSlice';
import { getBffUserProfile } from '@/hooks/auth/bff-session';

export function useRole(): RoleState {
  return useSelector((s: RootState) => s.role);
}

export function useRoleType(): string | null {
  return useSelector((s: RootState) => s.role.roleType);
}

export function useIsRoleInitialized(): boolean {
  return useSelector((s: RootState) => s.role.isInitialized);
}

export function useHasEntitlementRole(): boolean {
  const roleType = useSelector((s: RootState) => s.role.roleType);
  if (!roleType) return false;
  const upper = roleType.toUpperCase();
  return upper.includes('ECT-CLMS') || upper.includes('ECT-CHT');
}

/**
 * Returns true if the user belongs to any of the provided role/group strings.
 * Matching is case-insensitive and checks roleType, groups, roles, and realmRoles.
 */
export function useHasRole(...requiredRoles: string[]): boolean {
  const { roleType, groups, roles, realmRoles } = useSelector((s: RootState) => s.role);
  const allRoles = [roleType, ...groups, ...roles, ...realmRoles].filter(Boolean) as string[];
  return requiredRoles.some((r) =>
    allRoles.some((a) => a.toLowerCase().includes(r.toLowerCase()))
  );
}

export function useRoleActions() {
  const dispatch = useDispatch<AppDispatch>();

  const refresh = async () => {
    const profile = await getBffUserProfile();
    if (profile) {
      dispatch(initializeRoleFromBffProfile(profile));
    }
  };

  const clear = () => dispatch(clearRole());

  return { refresh, clear };
}

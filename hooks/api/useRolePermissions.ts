import { getBffUserProfile } from '@/hooks/auth/bff-session';
import { AppDispatch, RootState } from '@/store';
import { RolePermission, setPermissions, setPermissionsError, setPermissionsLoading } from '@/store/slices/roleSlice';
import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { authedFetch } from './authed-fetch';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

export function useRolePermissions() {
  const dispatch = useDispatch<AppDispatch>();
  const { roleType, org, permissions, permissionsLoading, permissionsError } = useSelector(
    (s: RootState) => s.role
  );
  const fetched = useRef(false);

  useEffect(() => {
    if (!roleType || fetched.current || permissions.length > 0) return;
    fetched.current = true;

    const run = async () => {
      dispatch(setPermissionsLoading());

      try {
        const profile = await getBffUserProfile();
        if (!profile) throw new Error('No active session');

        const body: object[] = [
          { field: 'entitlementCode', value: roleType, operator: 'eq' },
          ...(org ? [{ field: 'tenantCode', value: org, operator: 'eq' }] : []),
        ];

        const res = await authedFetch(`${API_BASE_URL}/api/query/attendance/role_permissions/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`${res.status}: ${text}`);
        }

        const data: RolePermission[] = await res.json();
        dispatch(setPermissions(data));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Request failed';
        dispatch(setPermissionsError(msg));
        fetched.current = false;
      }
    };

    void run();
  }, [roleType, org, dispatch, permissions.length]);

  return { permissions, loading: permissionsLoading, error: permissionsError };
}

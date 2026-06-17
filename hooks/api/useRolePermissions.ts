import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '@/store';
import { setPermissions, setPermissionsLoading, setPermissionsError, RolePermission } from '@/store/slices/roleSlice';
import { getAuthHeader } from '@/hooks/auth/token-store';

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
        const authHeader = await getAuthHeader();
        if (!authHeader) throw new Error('No access token available');

        const body: object[] = [
          { field: 'entitlementCode', value: roleType, operator: 'eq' },
          ...(org ? [{ field: 'tenantCode', value: org, operator: 'eq' }] : []),
        ];

        if (__DEV__) {
          console.log('[useRolePermissions] POST', `${API_BASE_URL}/api/query/attendance/role_permissions/search`, body);
        }

        const res = await fetch(`${API_BASE_URL}/api/query/attendance/role_permissions/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: authHeader,
          },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => '');
          console.error('[useRolePermissions] error response', res.status, text);
          throw new Error(`${res.status}: ${text}`);
        }

        const data: RolePermission[] = await res.json();
        if (__DEV__) {
          console.log('[useRolePermissions] success', data);
        }
        dispatch(setPermissions(data));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Request failed';
        dispatch(setPermissionsError(msg));
        fetched.current = false; // allow retry on next mount
      }
    };

    void run();
  }, [roleType, org, dispatch, permissions.length]);

  return { permissions, loading: permissionsLoading, error: permissionsError };
}

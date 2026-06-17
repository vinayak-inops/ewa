import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { decodeJwtPayload, extractEntitlementRole } from '@/utils/jwt';
import { getAuthHeader } from '@/hooks/auth/token-store';

export type RolePermission = {
  entitlementCode?: string;
  tenantCode?: string;
  screenPermissions?: unknown[];
  level?: number;
  [key: string]: unknown;
};

export interface RoleState {
  isInitialized: boolean;
  isLoading: boolean;
  roleType: string | null;
  groups: string[];
  roles: string[];
  realmRoles: string[];
  employeeId: string | null;
  org: string | null;
  sub: string | null;
  email: string | null;
  preferredUsername: string | null;
  error: string | null;
  permissions: RolePermission[];
  permissionsLoading: boolean;
  permissionsError: string | null;
}

const initialState: RoleState = {
  isInitialized: false,
  isLoading: false,
  roleType: null,
  groups: [],
  roles: [],
  realmRoles: [],
  employeeId: null,
  org: null,
  sub: null,
  email: null,
  preferredUsername: null,
  error: null,
  permissions: [],
  permissionsLoading: false,
  permissionsError: null,
};

export const initializeRoleFromToken = createAsyncThunk(
  'role/initializeFromToken',
  async (accessToken: string, { rejectWithValue }) => {
    try {
      const payload = decodeJwtPayload(accessToken);
      if (!payload) {
        return rejectWithValue('Failed to decode token');
      }

      const groups = (payload.groups as string[]) ?? [];
      const roles = (payload.roles as string[]) ?? [];
      const realmRoles = payload.realm_access?.roles ?? [];
      const roleType = extractEntitlementRole(payload);

      return {
        roleType,
        groups,
        roles,
        realmRoles,
        employeeId: (payload.employeeId as string) ?? null,
        org: (payload.org as string) ?? null,
        sub: payload.sub ?? null,
        email: payload.email ?? null,
        preferredUsername: payload.preferred_username ?? null,
      };
    } catch (e: unknown) {
      return rejectWithValue(e instanceof Error ? e.message : 'Unknown error');
    }
  }
);

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

export const fetchRolePermissions = createAsyncThunk(
  'role/fetchPermissions',
  async ({ roleType, org }: { roleType: string; org: string | null }, { rejectWithValue }) => {
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) return rejectWithValue('No access token');

      const body: object[] = [
        { field: 'entitlementCode', value: roleType, operator: 'eq' },
        ...(org ? [{ field: 'tenantCode', value: org, operator: 'eq' }] : []),
      ];

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
        return rejectWithValue(`${res.status}: ${text}`);
      }

      return (await res.json()) as RolePermission[];
    } catch (e: unknown) {
      return rejectWithValue(e instanceof Error ? e.message : 'Request failed');
    }
  }
);

const roleSlice = createSlice({
  name: 'role',
  initialState,
  reducers: {
    clearRole: () => initialState,
    setPermissionsLoading(state) {
      state.permissionsLoading = true;
      state.permissionsError = null;
    },
    setPermissions(state, action: { payload: RolePermission[] }) {
      state.permissions = action.payload;
      state.permissionsLoading = false;
      state.permissionsError = null;
    },
    setPermissionsError(state, action: { payload: string }) {
      state.permissionsLoading = false;
      state.permissionsError = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeRoleFromToken.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(initializeRoleFromToken.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.roleType = action.payload.roleType;
        state.groups = action.payload.groups;
        state.roles = action.payload.roles;
        state.realmRoles = action.payload.realmRoles;
        state.employeeId = action.payload.employeeId;
        state.org = action.payload.org;
        state.sub = action.payload.sub;
        state.email = action.payload.email;
        state.preferredUsername = action.payload.preferredUsername;
      })
      .addCase(initializeRoleFromToken.rejected, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.error = action.payload as string;
      })
      .addCase(fetchRolePermissions.pending, (state) => {
        state.permissionsLoading = true;
        state.permissionsError = null;
      })
      .addCase(fetchRolePermissions.fulfilled, (state, action) => {
        state.permissions = action.payload;
        state.permissionsLoading = false;
      })
      .addCase(fetchRolePermissions.rejected, (state, action) => {
        state.permissionsLoading = false;
        state.permissionsError = action.payload as string;
      });
  },
});

export const { clearRole, setPermissionsLoading, setPermissions, setPermissionsError } = roleSlice.actions;
export default roleSlice.reducer;

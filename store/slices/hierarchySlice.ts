import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getAuthHeader } from '@/hooks/auth/token-store';

export interface HierarchyData {
  _id?: string;
  employeeID?: string;
  roleID?: string;
  subsidiaries?: string[];
  divisions?: string[];
  departments?: string[];
  locations?: string[];
  contractors?: string[];
  organizationCode?: string;
  tenantCode?: string;
  isEndUser?: boolean;
  isManager?: boolean;
  [key: string]: unknown;
}

export interface HierarchyState {
  loading: boolean;
  error: string | null;
  data: HierarchyData | null;
}

const initialState: HierarchyState = {
  loading: false,
  error: null,
  data: null,
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

export const fetchHierarchy = createAsyncThunk(
  'hierarchy/fetch',
  async (
    { employeeId, tenantCode }: { employeeId: string; tenantCode: string },
    { rejectWithValue }
  ) => {
    try {
      const authHeader = await getAuthHeader();
      if (!authHeader) return rejectWithValue('No access token');

      const res = await fetch(`${API_BASE_URL}/api/query/attendance/userEntitlements/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify([
          { field: 'employeeID', operator: 'eq', value: employeeId },
          { field: 'tenantCode', operator: 'eq', value: tenantCode },
        ]),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        return rejectWithValue(`${res.status}: ${text}`);
      }

      const json = await res.json();
      const record = Array.isArray(json) ? json[0] : json;
      return (record ?? null) as HierarchyData | null;
    } catch (e: unknown) {
      return rejectWithValue(e instanceof Error ? e.message : 'Request failed');
    }
  }
);

const hierarchySlice = createSlice({
  name: 'hierarchy',
  initialState,
  reducers: {
    clearHierarchy: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHierarchy.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchHierarchy.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchHierarchy.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearHierarchy } = hierarchySlice.actions;
export default hierarchySlice.reducer;

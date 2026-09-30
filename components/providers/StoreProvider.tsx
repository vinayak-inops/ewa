import React, { useEffect, useRef } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store, AppDispatch, RootState } from '@/store';
import { initializeRoleFromBffProfile } from '@/store/slices/roleSlice';
import { fetchHierarchy } from '@/store/slices/hierarchySlice';
import { getBffUserProfile } from '@/hooks/auth/bff-session';

function RoleInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const isInitialized = useSelector((s: RootState) => s.role.isInitialized);
  const { employeeId, org } = useSelector((s: RootState) => s.role);
  const hierarchyData = useSelector((s: RootState) => s.hierarchy.data);
  const initializing = useRef(false);
  const hierarchyFetched = useRef(false);

  // Phase 1: load BFF profile and initialize identity
  useEffect(() => {
    if (isInitialized || initializing.current) return;
    initializing.current = true;

    getBffUserProfile().then((profile) => {
      if (profile) {
        dispatch(initializeRoleFromBffProfile(profile));
      } else {
        initializing.current = false;
      }
    });
  }, [dispatch, isInitialized]);

  // Phase 2: fetch data-scope (subsidiaries, divisions, departments, etc.)
  useEffect(() => {
    if (!isInitialized || !employeeId || !org) return;
    if (hierarchyData || hierarchyFetched.current) return;
    hierarchyFetched.current = true;
    dispatch(fetchHierarchy({ employeeId, tenantCode: org }));
  }, [dispatch, isInitialized, employeeId, org, hierarchyData]);

  return <>{children}</>;
}

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <RoleInitializer>{children}</RoleInitializer>
    </Provider>
  );
}

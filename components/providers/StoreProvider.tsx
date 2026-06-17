import React, { useEffect, useRef } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store, AppDispatch, RootState } from '@/store';
import { initializeRoleFromToken } from '@/store/slices/roleSlice';
import { getAccessToken } from '@/hooks/auth/token-store';

function RoleInitializer({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch<AppDispatch>();
  const isInitialized = useSelector((s: RootState) => s.role.isInitialized);
  const initializing = useRef(false);

  useEffect(() => {
    if (isInitialized || initializing.current) return;
    initializing.current = true;

    getAccessToken().then((token) => {
      if (token) {
        dispatch(initializeRoleFromToken(token));
      } else {
        initializing.current = false;
      }
    });
  }, [dispatch, isInitialized]);

  return <>{children}</>;
}

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <RoleInitializer>{children}</RoleInitializer>
    </Provider>
  );
}

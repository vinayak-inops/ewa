import { configureStore } from '@reduxjs/toolkit';
import roleReducer from './slices/roleSlice';
import hierarchyReducer from './slices/hierarchySlice';

export const store = configureStore({
  reducer: {
    role: roleReducer,
    hierarchy: hierarchyReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

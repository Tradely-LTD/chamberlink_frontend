import { configureStore } from '@reduxjs/toolkit';
import { emptyApi } from '@shared/api/emptyApi';
import authReducer from '@features/auth/authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [emptyApi.reducerPath]: emptyApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(emptyApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser, Role } from '@entities/user/types';

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  role: Role | null;
  pendingMfaUserId: string | null;
  pendingVerifyUserId: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  accessToken: null,
  user: null,
  role: null,
  pendingMfaUserId: null,
  pendingVerifyUserId: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ accessToken: string; user: AuthUser }>
    ) => {
      state.accessToken = action.payload.accessToken;
      state.user = action.payload.user;
      state.role = action.payload.user.role;
      state.isAuthenticated = true;
      state.pendingMfaUserId = null;
      state.pendingVerifyUserId = null;
    },
    setPendingMfa: (state, action: PayloadAction<{ userId: string }>) => {
      state.pendingMfaUserId = action.payload.userId;
      state.accessToken = null;
      state.user = null;
      state.role = null;
      state.isAuthenticated = false;
    },
    setPendingVerify: (state, action: PayloadAction<{ userId: string }>) => {
      state.pendingVerifyUserId = action.payload.userId;
    },
    updateUser: (state, action: PayloadAction<Partial<AuthUser>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    logout: () => initialState,
  },
});

export const { setCredentials, setPendingMfa, setPendingVerify, updateUser, logout } =
  authSlice.actions;
export default authSlice.reducer;

import { emptyApi } from '@shared/api/emptyApi';
import type { AuthUser } from '@entities/user/types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export const authApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<
      | { requiresMfa: true; userId: string }
      | { requiresMfa: false; accessToken: string; refreshToken: string },
      { email: string; password: string }
    >({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      transformResponse: (
        res: ApiResponse<
          | { requiresMfa: true; userId: string }
          | { requiresMfa: false; accessToken: string; refreshToken: string }
        >
      ) => res.data,
    }),
    register: builder.mutation<
      { userId: string; message: string },
      { firstName: string; lastName: string; email: string; phone: string; password: string }
    >({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      transformResponse: (res: ApiResponse<{ userId: string; message: string }>) => res.data,
    }),
    verifyEmail: builder.mutation<{ message: string }, { userId: string; code: string }>({
      query: (body) => ({ url: '/auth/verify-email', method: 'POST', body }),
      transformResponse: (res: ApiResponse<{ message: string }>) => res.data,
    }),
    verifyMfa: builder.mutation<
      { accessToken: string; refreshToken: string },
      { userId: string; code: string }
    >({
      query: (body) => ({ url: '/auth/verify-mfa', method: 'POST', body }),
      transformResponse: (res: ApiResponse<{ accessToken: string; refreshToken: string }>) => res.data,
    }),
    refresh: builder.mutation<
      { accessToken: string; refreshToken: string },
      { refreshToken: string }
    >({
      query: (body) => ({ url: '/auth/refresh', method: 'POST', body }),
      transformResponse: (res: ApiResponse<{ accessToken: string; refreshToken: string }>) => res.data,
    }),
    forgotPassword: builder.mutation<void, { email: string }>({
      query: (body) => ({ url: '/auth/forgot-password', method: 'POST', body }),
    }),
    resetPassword: builder.mutation<void, { userId: string; code: string; newPassword: string }>({
      query: (body) => ({ url: '/auth/reset-password', method: 'POST', body }),
    }),
    logoutUser: builder.mutation<void, { refreshToken?: string }>({
      query: (body) => ({ url: '/auth/logout', method: 'POST', body }),
    }),
    getMe: builder.query<AuthUser, void>({
      query: () => '/auth/me',
      transformResponse: (res: ApiResponse<AuthUser>) => res.data,
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useVerifyEmailMutation,
  useVerifyMfaMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useLogoutUserMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
} = authApi;

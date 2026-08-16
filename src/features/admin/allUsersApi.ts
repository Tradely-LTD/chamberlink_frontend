import { emptyApi } from '@shared/api/emptyApi';
import type { Role, ChamberConnection } from '@entities/user/types';

export interface AllUsersListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  isEmailVerified: boolean;
  tenantId: string | null;
  tenantName: string | null;
  activeTenantId: string | null;
  createdAt: string;
  connections: ChamberConnection[];
}

interface GetAllUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: Role;
  tenantId?: string;
  isActive?: boolean;
}

interface GetAllUsersResponse {
  items: AllUsersListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpdateAllUserPayload {
  userId: string;
  role?: Role;
  isActive?: boolean;
  tenantId?: string | null;
  chamberTenantIds?: string[];
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const allUsersApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllUsers: builder.query<GetAllUsersResponse, GetAllUsersParams | void>({
      query: (params) => ({ url: '/admin/all-users', params: params ?? {} }),
      transformResponse: (res: ApiResponse<GetAllUsersResponse>) => res.data,
      providesTags: ['AllUsers'],
    }),
    updateAllUser: builder.mutation<AllUsersListItem & { warnings: string[] }, UpdateAllUserPayload>({
      query: ({ userId, ...body }) => ({ url: `/admin/all-users/${userId}`, method: 'PATCH', body }),
      transformResponse: (res: ApiResponse<AllUsersListItem & { warnings: string[] }>) => res.data,
      invalidatesTags: ['AllUsers'],
    }),
    resetUserPassword: builder.mutation<{ message: string }, { userId: string; newPassword: string }>({
      query: ({ userId, newPassword }) => ({ url: `/admin/all-users/${userId}/reset-password`, method: 'POST', body: { newPassword } }),
      transformResponse: (res: ApiResponse<{ message: string }>) => res.data,
    }),
  }),
  overrideExisting: false,
});

export const { useGetAllUsersQuery, useUpdateAllUserMutation, useResetUserPasswordMutation } = allUsersApi;

import { emptyApi } from '@shared/api/emptyApi';
import type { AuthUser } from '@entities/user/types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  actorEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  notes?: string;
  createdAt: string;
}

export const adminApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminUsers: builder.query<
      PaginatedResponse<AuthUser>,
      { page?: number; limit?: number; search?: string }
    >({
      query: ({ page = 1, limit = 20, search } = {}) => ({
        url: '/admin/users',
        params: { page, limit, ...(search ? { search } : {}) },
      }),
      transformResponse: (res: ApiResponse<PaginatedResponse<AuthUser>>) => res.data,
      providesTags: ['Members'],
    }),
    getAuditLogs: builder.query<
      PaginatedResponse<AuditLog>,
      { page?: number; limit?: number }
    >({
      query: ({ page = 1, limit = 20 } = {}) => ({
        url: '/admin/audit-logs',
        params: { page, limit },
      }),
      transformResponse: (res: ApiResponse<PaginatedResponse<AuditLog>>) => res.data,
      providesTags: ['AuditLogs'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAdminUsersQuery,
  useGetAuditLogsQuery,
} = adminApi;

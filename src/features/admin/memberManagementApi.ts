import { emptyApi } from '@shared/api/emptyApi';

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  firstName: string | null;
  lastName: string | null;
  memberId: string | null;
  tierName: string | null;
  memberStatus: string | null;
  businessName: string | null;
  expiresAt: string | null;
}

export interface AdminUsersResponse {
  items: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export interface PaymentRecord {
  id: string;
  userId: string;
  reference: string;
  gatewayReference: string | null;
  gateway: string;
  amount: number;
  currency: string;
  purpose: string;
  resourceId: string | null;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BulkImportResponse {
  imported: number;
  failed: Array<{ row: number; email: string; reason: string }>;
}

interface DeactivateReactivateResponse {
  success: true;
  data: { message: string };
}

interface GetMembersParams {
  page?: number;
  limit?: number;
  search?: string;
  tenantId?: string;
  status?: string;
}

interface GetPaymentsParams {
  memberId: string;
  pageSize?: number;
}

const memberManagementApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    getMembers: builder.query<AdminUsersResponse, GetMembersParams>({
      query: ({ page = 1, limit = 20, search, tenantId, status }) => ({
        url: '/admin/users',
        params: {
          page,
          limit,
          ...(search && search.length > 0 ? { search } : {}),
          ...(tenantId && tenantId.length > 0 ? { tenantId } : {}),
          ...(status && status.length > 0 ? { status } : {}),
        },
      }),
      transformResponse: (res: { success: true; data: AdminUsersResponse }) => res.data,
      providesTags: ['AdminMembers'],
    }),

    getMemberPayments: builder.query<PaymentRecord[], GetPaymentsParams>({
      query: ({ memberId, pageSize = 50 }) => ({
        url: '/admin/payments',
        params: { memberId, pageSize },
      }),
      transformResponse: (res: { success: true; data: PaymentRecord[] }) => res.data,
    }),

    deactivateMember: builder.mutation<DeactivateReactivateResponse, string>({
      query: (userId) => ({
        url: `/admin/users/${userId}/deactivate`,
        method: 'PATCH',
      }),
      invalidatesTags: ['AdminMembers'],
    }),

    reactivateMember: builder.mutation<DeactivateReactivateResponse, string>({
      query: (userId) => ({
        url: `/admin/users/${userId}/reactivate`,
        method: 'PATCH',
      }),
      invalidatesTags: ['AdminMembers'],
    }),

    bulkImportMembers: builder.mutation<BulkImportResponse, FormData>({
      query: (formData) => ({
        url: '/admin/members/bulk-import',
        method: 'POST',
        body: formData,
        // Do NOT set Content-Type — let the browser set it with the boundary
        formData: true,
      }),
      invalidatesTags: ['AdminMembers'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetMembersQuery,
  useLazyGetMembersQuery,
  useGetMemberPaymentsQuery,
  useDeactivateMemberMutation,
  useReactivateMemberMutation,
  useBulkImportMembersMutation,
} = memberManagementApi;

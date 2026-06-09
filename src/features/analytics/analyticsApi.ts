import { emptyApi } from '@shared/api/emptyApi';

export interface AnalyticsSummary {
  totalMembers: number;
  activeMembers: number;
  pendingRenewals: number;
  ecoCertificatesIssued: number;
  revenueThisMonth: number;
  revenueLastMonth: number;
  newMembersThisMonth: number;
  tradeFairRegistrations: number;
}

interface ApiResponse<T> { success: boolean; data: T; }

const analyticsApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    getAnalyticsSummary: builder.query<AnalyticsSummary, void>({
      query: () => '/admin/analytics/summary',
      transformResponse: (res: ApiResponse<AnalyticsSummary>) => res.data,
    }),
  }),
  overrideExisting: false,
});

export const { useGetAnalyticsSummaryQuery } = analyticsApi;

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

export interface AnalyticsTrendPoint {
  month: string; // "YYYY-MM"
  newMembers: number;
  revenue: number;
  ecoIssued: number;
}

/** One row of a geographic/goods breakdown: a country, Nigerian state or 2-digit HS chapter. */
export interface AnalyticsGeoBucket {
  key: string;
  applications: number;
  issued: number;
}

export interface AnalyticsGeo {
  destinations: AnalyticsGeoBucket[];
  origins: AnalyticsGeoBucket[];
  hsChapters: AnalyticsGeoBucket[];
}

interface ApiResponse<T> { success: boolean; data: T; }

const analyticsApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    getAnalyticsSummary: builder.query<AnalyticsSummary, void>({
      query: () => '/admin/analytics/summary',
      transformResponse: (res: ApiResponse<AnalyticsSummary>) => res.data,
    }),
    getAnalyticsTrends: builder.query<AnalyticsTrendPoint[], number | void>({
      query: (months = 6) => `/admin/analytics/trends?months=${months}`,
      transformResponse: (res: ApiResponse<{ months: AnalyticsTrendPoint[] }>) => res.data.months,
    }),
    getAnalyticsGeo: builder.query<AnalyticsGeo, void>({
      query: () => '/admin/analytics/geo',
      transformResponse: (res: ApiResponse<AnalyticsGeo>) => res.data,
    }),
  }),
  overrideExisting: false,
});

export const { useGetAnalyticsSummaryQuery, useGetAnalyticsTrendsQuery, useGetAnalyticsGeoQuery } = analyticsApi;

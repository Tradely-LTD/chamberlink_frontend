import { emptyApi } from '@shared/api/emptyApi';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * State of the tax-authority check on a company's TIN (RFP §3.2, §6.2).
 *
 * `pending_review` is the NORMAL state of a newly registered company, not an
 * error: no Nigeria Revenue Service API is integrated, so a NACCIMA
 * administrator confirms each TIN by hand. Copy in the UI must reflect that
 * rather than implying something went wrong.
 */
export type TinVerificationStatus = 'pending_review' | 'verified' | 'failed';

export interface ExporterCompany {
  id: string;
  tin: string;
  /** Best available name — the registered one once verified, else what was submitted. */
  name: string;
  address: string | null;
  /** What the applicant typed. Kept visible so a mismatch with the tax record is obvious. */
  submittedName: string;
  submittedAddress: string | null;
  /** What the tax authority (or an administrator reading the record) confirmed. */
  registeredName: string | null;
  registeredAddress: string | null;
  verificationStatus: TinVerificationStatus;
  verifiedAt: string | null;
  verificationNotes: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string;
}

export interface CompanyMember {
  userId: string;
  role: 'owner' | 'sub_user';
  createdAt: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface MyCompanyResponse {
  /** Null when the user has registered no company — a valid state, not a 404. */
  company: ExporterCompany | null;
  role: 'owner' | 'sub_user' | null;
  members: CompanyMember[];
  /** Server-configured cap on sub-users, excluding the owner (RFP §6.2). */
  maxSubUsers: number;
}

export interface RegisterCompanyPayload {
  tin: string;
  submittedName: string;
  submittedAddress?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export const companiesApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyCompany: builder.query<MyCompanyResponse, void>({
      query: () => '/companies/me',
      transformResponse: (res: ApiResponse<MyCompanyResponse>) => res.data,
      providesTags: ['Company'],
    }),
    registerCompany: builder.mutation<{ company: ExporterCompany; role: 'owner' }, RegisterCompanyPayload>({
      query: (body) => ({ url: '/companies/register', method: 'POST', body }),
      transformResponse: (res: ApiResponse<{ company: ExporterCompany; role: 'owner' }>) => res.data,
      invalidatesTags: ['Company'],
    }),
    addCompanySubUser: builder.mutation<{ userId: string; role: 'sub_user' }, { email: string }>({
      query: (body) => ({ url: '/companies/sub-users', method: 'POST', body }),
      transformResponse: (res: ApiResponse<{ userId: string; role: 'sub_user' }>) => res.data,
      invalidatesTags: ['Company'],
    }),
    removeCompanySubUser: builder.mutation<{ removed: boolean }, string>({
      query: (userId) => ({ url: `/companies/sub-users/${userId}`, method: 'DELETE' }),
      transformResponse: (res: ApiResponse<{ removed: boolean }>) => res.data,
      invalidatesTags: ['Company'],
    }),

    // ── Administrator: TIN verification queue (RFP §4.1.3) ──────────────────
    getCompanyQueue: builder.query<ExporterCompany[], TinVerificationStatus | void>({
      query: (status) => (status ? `/companies/admin/queue?status=${status}` : '/companies/admin/queue'),
      transformResponse: (res: ApiResponse<ExporterCompany[]>) => res.data,
      providesTags: ['CompanyQueue'],
    }),
    reviewCompany: builder.mutation<
      ExporterCompany,
      { companyId: string; decision: 'verify' | 'fail'; registeredName?: string; registeredAddress?: string; notes?: string }
    >({
      query: ({ companyId, ...body }) => ({ url: `/companies/admin/${companyId}/review`, method: 'POST', body }),
      transformResponse: (res: ApiResponse<ExporterCompany>) => res.data,
      invalidatesTags: ['CompanyQueue', 'Company'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetMyCompanyQuery,
  useRegisterCompanyMutation,
  useAddCompanySubUserMutation,
  useRemoveCompanySubUserMutation,
  useGetCompanyQueueQuery,
  useReviewCompanyMutation,
} = companiesApi;

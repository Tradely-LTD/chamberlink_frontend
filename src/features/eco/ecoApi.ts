import { emptyApi } from '@shared/api/emptyApi';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export type ECertStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'pending_payment'
  | 'approved'
  | 'issued'
  | 'rejected'
  | 'revision_requested';

export interface ChamberOption {
  id: string;
  name: string;
}

export interface EcoQueueItem {
  id: string;
  certificateNumber?: string;
  companyName: string;
  solidMineralName: string;
  destinationCountry: string;
  status: ECertStatus;
  createdAt: string;
  membershipId?: string;
  rejectionReason?: string;
  revisionNotes?: string;
  certificatePdfUrl?: string | null;
}

export interface ECertificate {
  id: string;
  certificateNumber?: string;
  memberId?: string;
  applicantUserId: string;

  // Product details
  solidMineralName: string;
  descriptionOfGoods: string;
  originOfGoods: string;
  destinationCountry: string;
  batchIdNo?: string;

  // Company details
  isLicenseOwner: boolean;
  miningLicenseNo?: string;
  companyName: string;
  companyAddress: string;
  companyEmail?: string;
  companyPhone?: string;

  // Commercial information
  invoiceTotal: number;
  isChamberMember: boolean;
  membershipId?: string;
  chamberOfCommerceId: string;

  status: ECertStatus;
  applicationFee?: number;
  paymentRef?: string;
  certificatePdfUrl?: string;
  signedDownloadUrl?: string;
  rejectionReason?: string;
  revisionNotes?: string;
  issuedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewECertPayload {
  solidMineralName: string;
  descriptionOfGoods: string;
  originOfGoods: string;
  destinationCountry: string;
  batchIdNo?: string;

  isLicenseOwner: boolean;
  miningLicenseNo?: string;
  companyName: string;
  companyAddress: string;
  companyEmail?: string;
  companyPhone?: string;

  invoiceTotal: number;
  isChamberMember: boolean;
  membershipId?: string;
  chamberOfCommerceId: string;
}

export const ecoApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    getEcoChambers: builder.query<ChamberOption[], void>({
      query: () => '/eco/chambers',
      transformResponse: (res: ApiResponse<ChamberOption[]>) => res.data,
    }),
    getEcoCertificates: builder.query<ECertificate[], void>({
      query: () => '/eco/my',
      transformResponse: (res: ApiResponse<ECertificate[]>) => res.data,
      providesTags: ['ECO'],
    }),
    getEcoCertificate: builder.query<ECertificate, string>({
      query: (id) => `/eco/${id}`,
      transformResponse: (res: ApiResponse<ECertificate>) => res.data,
      providesTags: (_result, _error, id) => [{ type: 'ECO', id }],
    }),
    createEcoCertificate: builder.mutation<ECertificate, NewECertPayload>({
      query: (payload) => ({
        url: '/eco',
        method: 'POST',
        body: payload,
      }),
      transformResponse: (res: ApiResponse<ECertificate>) => res.data,
      invalidatesTags: ['ECO'],
    }),
    // Used when the applicant is uploading files (multipart/form-data)
    createEcoCertificateWithFiles: builder.mutation<ECertificate, FormData>({
      query: (formData) => ({
        url: '/eco',
        method: 'POST',
        body: formData,
        formData: true,
      }),
      transformResponse: (res: ApiResponse<ECertificate>) => res.data,
      invalidatesTags: ['ECO'],
    }),
    // Save a draft (partial fields, no validation)
    saveDraftEco: builder.mutation<ECertificate, FormData | Partial<NewECertPayload>>({
      query: (body) => body instanceof FormData
        ? { url: '/eco/draft', method: 'POST', body, formData: true }
        : { url: '/eco/draft', method: 'POST', body },
      transformResponse: (res: ApiResponse<ECertificate>) => res.data,
      invalidatesTags: ['ECO'],
    }),
    // Update a draft or revision_requested cert
    updateEcoDraft: builder.mutation<ECertificate, { certId: string; body: FormData | Partial<NewECertPayload> }>({
      query: ({ certId, body }) => body instanceof FormData
        ? { url: `/eco/${certId}`, method: 'PATCH', body, formData: true }
        : { url: `/eco/${certId}`, method: 'PATCH', body },
      transformResponse: (res: ApiResponse<ECertificate>) => res.data,
      invalidatesTags: ['ECO'],
    }),
    // Submit a draft or revision_requested cert
    submitEcoDraft: builder.mutation<ECertificate, { certId: string; body: FormData | NewECertPayload }>({
      query: ({ certId, body }) => body instanceof FormData
        ? { url: `/eco/${certId}/submit`, method: 'POST', body, formData: true }
        : { url: `/eco/${certId}/submit`, method: 'POST', body },
      transformResponse: (res: ApiResponse<ECertificate>) => res.data,
      invalidatesTags: ['ECO'],
    }),
    getAdminEcoQueue: builder.query<EcoQueueItem[], { status?: string; page?: number }>({
      query: ({ status, page = 1 } = {}) => ({
        url: '/eco/admin/queue',
        params: { ...(status ? { status } : {}), page, limit: 50 },
      }),
      transformResponse: (res: ApiResponse<EcoQueueItem[]>) => res.data,
      providesTags: ['EcoQueue'],
    }),
    reviewEcoCert: builder.mutation<void, { id: string; action: 'start_review' | 'approve' | 'reject' | 'request_revision'; notes?: string }>({
      query: ({ id, ...body }) => ({ url: `/eco/${id}/review`, method: 'POST', body }),
      invalidatesTags: ['EcoQueue'],
    }),
    reIssueCertificate: builder.mutation<{ certNumber: string; pdfUrl: string }, string>({
      query: (id) => ({ url: `/eco/${id}/issue`, method: 'POST' }),
      transformResponse: (res: { success: boolean; data: { certNumber: string; pdfUrl: string } }) => res.data,
      invalidatesTags: (_r, _e, id) => [{ type: 'ECO', id }, 'EcoQueue'],
    }),
    getEcoCertDownloadUrl: builder.query<{ url: string; certId: string; status: string }, string>({
      query: (certId) => `/eco/${certId}/download`,
      transformResponse: (res: ApiResponse<{ url: string; certId: string; status: string }>) => res.data,
    }),
    initiateEcoPayment: builder.mutation<{ authorizationUrl: string; reference: string; gateway: string }, { certificateId: string; callbackUrl?: string }>({
      query: (body) => ({ url: '/eco/payment/initiate', method: 'POST', body }),
      transformResponse: (res: ApiResponse<{ authorizationUrl: string; reference: string; gateway: string }>) => res.data,
      invalidatesTags: ['ECO'],
    }),
    confirmEcoPayment: builder.mutation<void, { reference: string }>({
      // Public endpoint — no auth header needed; reference is the proof of payment
      query: (body) => ({ url: '/eco/payment/confirm', method: 'POST', body }),
      invalidatesTags: ['ECO', 'EcoQueue'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetEcoChambersQuery,
  useGetEcoCertificatesQuery,
  useGetEcoCertificateQuery,
  useCreateEcoCertificateMutation,
  useCreateEcoCertificateWithFilesMutation,
  useSaveDraftEcoMutation,
  useUpdateEcoDraftMutation,
  useSubmitEcoDraftMutation,
  useGetAdminEcoQueueQuery,
  useReviewEcoCertMutation,
  useReIssueCertificateMutation,
  useGetEcoCertDownloadUrlQuery,
  useLazyGetEcoCertDownloadUrlQuery,
  useInitiateEcoPaymentMutation,
  useConfirmEcoPaymentMutation,
} = ecoApi;

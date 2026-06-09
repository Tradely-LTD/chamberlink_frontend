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

export interface EcoQueueItem {
  id: string;
  certificateNumber?: string;
  applicantName: string;
  exporterName: string;
  cargoDescription: string;
  destinationCountry: string;
  status: ECertStatus;
  createdAt: string;
  memberId?: string;
  rejectionReason?: string;
  revisionNotes?: string;
  certificatePdfUrl?: string | null;
}

interface NestedQueueItem {
  cert: {
    id: string; certificateNumber?: string; exporterName: string;
    cargoDescription: string; destinationCountry: string; status: ECertStatus;
    createdAt: string; rejectionReason?: string; revisionNotes?: string;
    certificatePdfUrl?: string | null;
  };
  member: { firstName: string; lastName: string; memberId: string };
}

export interface ECertificate {
  id: string;
  certificateNumber?: string;
  memberId: string;
  applicantUserId: string;
  hsCode: string;
  cargoDescription: string;
  cargoWeight: number;
  shippingMethod: string;
  destinationCountry: string;
  destinationPort?: string;
  exporterName: string;
  exporterAddress: string;
  consigneeName?: string;
  consigneeAddress?: string;
  status: ECertStatus;
  isExpedited: boolean;
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
  hsCode: string;
  cargoDescription: string;
  cargoWeight: number;
  shippingMethod: 'sea' | 'air' | 'road' | 'rail';
  destinationCountry: string;
  destinationPort?: string;
  exporterName: string;
  exporterAddress: string;
  consigneeName?: string;
  consigneeAddress?: string;
  isExpedited?: boolean;
  // Document library IDs (alternative to file upload)
  commercialInvoiceDocId?: string;
  packingListDocId?: string;
  additionalDocIds?: string[];
}

export const ecoApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
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
        body: {
          ...payload,
          cargoWeight: Number(payload.cargoWeight),
          isExpedited: Boolean(payload.isExpedited),
        },
      }),
      transformResponse: (res: ApiResponse<ECertificate>) => res.data,
      invalidatesTags: ['ECO'],
    }),
    // Used when the member is uploading files (multipart/form-data)
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
    saveDraftEco: builder.mutation<ECertificate, FormData | NewECertPayload>({
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
      transformResponse: (res: ApiResponse<NestedQueueItem[]>) =>
        res.data.map((item) => ({
          id: item.cert.id,
          certificateNumber: item.cert.certificateNumber,
          applicantName: `${item.member.firstName} ${item.member.lastName}`,
          exporterName: item.cert.exporterName,
          cargoDescription: item.cert.cargoDescription,
          destinationCountry: item.cert.destinationCountry,
          status: item.cert.status,
          createdAt: item.cert.createdAt,
          memberId: item.member.memberId,
          rejectionReason: item.cert.rejectionReason,
          revisionNotes: item.cert.revisionNotes,
          certificatePdfUrl: item.cert.certificatePdfUrl,
        })),
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

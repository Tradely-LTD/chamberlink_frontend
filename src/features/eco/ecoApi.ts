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
  | 'revision_requested'
  | 'approved'
  | 'pending_payment'
  | 'issued'
  | 'rejected';

export interface SolidMineral {
  id: string;
  name: string;
  hsCode: string;
}

export interface OnboardedTenant {
  id: string;
  name: string;
  slug: string;
  city: string | null;
}

export interface ECertificate {
  id: string;
  certificateNumber: string | null;
  applicantUserId: string;
  tenantId: string | null;
  memberId: string | null;

  // Product/Goods Details
  solidMineralId: string | null;
  solidMineralName: string | null;
  hsCode: string | null;
  descriptionOfGoods: string | null;
  numberAndKindOfPackages: string | null;
  marksAndNumbers: string | null;
  quantity: number | null;
  quantityUnit: 'KG' | 'MT' | null;
  originStates: string[];
  destinationCountry: string | null;
  destinationPort: string | null;
  batchIdNo: string | null;

  // Exporter/Company Details
  isLicenseOwner: boolean;
  miningLicenseNo: string | null;
  companyName: string | null;
  companyAddress: string | null;
  companyCountry: string | null;
  companyEmail: string | null;
  companyPhone: string | null;

  // Consignee Details
  consigneeName: string | null;
  consigneeAddress: string | null;

  // Shipment & Transport
  departureDate: string | null;
  meansOfTransport: 'sea' | 'air' | 'land' | null;
  vesselFlightVehicleNameVoyageNo: string | null;
  portOfLoading: string | null;
  portOfDischarge: string | null;
  issuedRetrospectively: boolean;

  // Commercial Information
  invoiceNumber: string | null;
  invoiceDate: string | null;
  invoiceTotal: number | null;
  invoiceCurrency: 'NGN' | 'USD';
  invoiceFileKey: string | null;
  customerOrderOrLcNo: string | null;
  selfDeclaredIsMember: boolean;
  selfDeclaredMembershipId: string | null;

  // Compliance/Declaration uploads
  signatureKey: string | null;
  cacCertificateKey: string | null;
  nepcCertificateKey: string | null;
  additionalDocsKeys: string | null;

  // Application state
  status: ECertStatus;
  applicationFee: number | null;
  membershipVerified: boolean;
  paymentRef: string | null;
  paymentGateway: string | null;
  paidAt: string | null;

  reviewedByUserId: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  revisionNotes: string | null;

  certificatePdfKey: string | null;
  certificatePdfUrl: string | null;
  qrCodeData: string | null;
  issuedAt: string | null;

  createdAt: string;
  updatedAt: string;

  // Optional client-only field: fresh signed URL for the currently-loaded cert
  signedDownloadUrl?: string;
}

export interface NewECertPayload {
  solidMineralId: string;
  descriptionOfGoods: string;
  numberAndKindOfPackages: string;
  marksAndNumbers?: string;
  quantity: number;
  quantityUnit: 'KG' | 'MT';
  originStates: string[];
  destinationCountry: string;
  destinationPort?: string;
  batchIdNo?: string;
  isLicenseOwner: boolean;
  miningLicenseNo?: string;
  companyName: string;
  companyAddress: string;
  companyCountry: string;
  companyEmail: string;
  companyPhone: string;
  consigneeName: string;
  consigneeAddress: string;
  departureDate: string;
  meansOfTransport: 'sea' | 'air' | 'land';
  vesselFlightVehicleNameVoyageNo: string;
  portOfLoading: string;
  portOfDischarge: string;
  invoiceNumber?: string;
  invoiceDate: string;
  invoiceTotal: number;
  invoiceCurrency: 'NGN' | 'USD';
  customerOrderOrLcNo?: string;
  tenantId: string;
  selfDeclaredIsMember: boolean;
  selfDeclaredMembershipId?: string;
  // library-doc references (alternative to file upload, existing DocSlot pattern)
  invoiceDocId?: string;
  signatureDocId?: string;
  cacCertificateDocId?: string;
  nepcCertificateDocId?: string;
  additionalDocIds?: string[];
}

export interface EcoQueueItem {
  id: string;
  certificateNumber: string | null;
  applicantFirstName: string;
  applicantLastName: string;
  memberId?: string;
  solidMineralName: string | null;
  destinationCountry: string | null;
  status: ECertStatus;
  createdAt: string;
  selfDeclaredIsMember: boolean;
  rejectionReason?: string | null;
  revisionNotes?: string | null;
  certificatePdfUrl?: string | null;
}

interface NestedQueueItem {
  cert: ECertificate;
  member: { firstName: string; lastName: string; memberId: string } | null;
  applicantFirstName: string;
  applicantLastName: string;
}

export const ecoApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    getSolidMinerals: builder.query<SolidMineral[], void>({
      query: () => '/eco/solid-minerals',
      transformResponse: (res: ApiResponse<SolidMineral[]>) => res.data,
    }),
    getOnboardedTenants: builder.query<OnboardedTenant[], void>({
      query: () => '/tenants/public/onboarded',
      transformResponse: (res: ApiResponse<OnboardedTenant[]>) => res.data,
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
        body: {
          ...payload,
          quantity: Number(payload.quantity),
        },
      }),
      transformResponse: (res: ApiResponse<ECertificate>) => res.data,
      invalidatesTags: ['ECO'],
    }),
    // Used for a guest/non-member applicant's FIRST submission with raw
    // uploaded files (no chamber connection => no document library to
    // reference by docId — see DocSlot in EcoApplyPage.tsx). Multipart/
    // form-data; the backend's ecoUpload middleware (multer.fields) parses
    // it, no-ops for a plain JSON body on this same route otherwise.
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
    // Save a draft (partial fields, no validation). Compliance documents are
    // attached by reference (invoiceDocId etc.) for a connected member, via
    // documentsApi's uploadDocument — or, for a zero-connection guest
    // applicant with no document library to upload into, as a raw multipart
    // file directly on this same request (see DocSlot/buildFormDataOrJson in
    // EcoApplyPage.tsx). Both shapes hit the same backend route.
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
      transformResponse: (res: ApiResponse<NestedQueueItem[]>) =>
        res.data.map((item) => ({
          id: item.cert.id,
          certificateNumber: item.cert.certificateNumber,
          applicantFirstName: item.applicantFirstName,
          applicantLastName: item.applicantLastName,
          memberId: item.member?.memberId,
          solidMineralName: item.cert.solidMineralName,
          destinationCountry: item.cert.destinationCountry,
          status: item.cert.status,
          createdAt: item.cert.createdAt,
          selfDeclaredIsMember: item.cert.selfDeclaredIsMember,
          rejectionReason: item.cert.rejectionReason,
          revisionNotes: item.cert.revisionNotes,
          certificatePdfUrl: item.cert.certificatePdfUrl,
        })),
      providesTags: ['EcoQueue'],
    }),
    reviewEcoCert: builder.mutation<void, {
      id: string;
      action: 'start_review' | 'verify_membership' | 'approve' | 'reject' | 'request_revision';
      verified?: boolean;
      notes?: string;
      rejectionReason?: string;
    }>({
      query: ({ id, ...body }) => ({ url: `/eco/${id}/review`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: 'ECO', id }, 'EcoQueue'],
    }),
    // Not covered by the new contract (unchanged endpoint) — kept for the
    // "Re-generate Certificate" / "Re-issue (Replacement Copy)" admin actions.
    reIssueCertificate: builder.mutation<{ certNumber: string; pdfUrl: string }, string>({
      query: (id) => ({ url: `/eco/${id}/issue`, method: 'POST' }),
      transformResponse: (res: { success: boolean; data: { certNumber: string; pdfUrl: string } }) => res.data,
      invalidatesTags: (_r, _e, id) => [{ type: 'ECO', id }, 'EcoQueue'],
    }),
    getEcoCertDownloadUrl: builder.query<{ url: string; certId: string; status: string }, string>({
      query: (certId) => `/eco/${certId}/download`,
      transformResponse: (res: ApiResponse<{ url: string; certId: string; status: string }>) => res.data,
    }),
    getEcoDocumentUrl: builder.query<{ url: string }, { certId: string; docType: 'invoice' | 'signature' | 'cac' | 'nepc' }>({
      query: ({ certId, docType }) => `/eco/${certId}/documents/${docType}`,
      transformResponse: (res: ApiResponse<{ url: string }>) => res.data,
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
  useGetSolidMineralsQuery,
  useGetOnboardedTenantsQuery,
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
  useLazyGetEcoDocumentUrlQuery,
  useInitiateEcoPaymentMutation,
  useConfirmEcoPaymentMutation,
} = ecoApi;

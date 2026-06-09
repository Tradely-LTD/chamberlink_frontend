import { emptyApi } from '@shared/api/emptyApi';

// ── Types ─────────────────────────────────────────────────────────────────

export type DocType =
  | 'packing_list'
  | 'commercial_invoice'
  | 'combined_certificate'
  | 'export_declaration'
  | 'phytosanitary';

export interface ExportDocument {
  id: string;
  type: DocType;
  title: string;
  referenceNo: string;
  consignee: string;
  destinationCountry: string;
  products: string;
  status: 'draft' | 'processing' | 'ready' | 'downloaded';
  createdAt: string;
  downloadUrl?: string;
  memberName?: string;
  memberId?: string;
  draftId?: string | null;
}

export interface CreateExportDocPayload {
  type: DocType;
  consignee: string;
  destinationCountry: string;
  products: string;
}

export interface GetAllExportDocsArgs {
  page?: number;
  limit?: number;
  status?: ExportDocument['status'];
}

interface ApiSingleResponse<T> {
  success: boolean;
  data: T;
}

interface ApiListResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ── API ───────────────────────────────────────────────────────────────────

// ── Generator types ───────────────────────────────────────────────────────

export interface LineItem {
  description: string;
  hsCode?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  netWeight?: number;
  grossWeight?: number;
  marksAndNumbers?: string;
  // Packing list only
  length?: number;
  width?: number;
  height?: number;
  dimensionUnit?: 'cm' | 'm' | 'in';
  numberOfPackages?: number;
  packageType?: string;
}

export interface GenerateExportDocPayload {
  type: 'commercial_invoice' | 'packing_list';
  sellerName: string;
  sellerAddress: string;
  buyerName: string;
  buyerAddress: string;
  invoiceNumber?: string;
  invoiceDate: string; // YYYY-MM-DD
  destinationCountry: string;
  lineItems: LineItem[];
  notes?: string;
  draftId?: string;
  // Packing list shipment-level fields
  shippingMethod?: 'sea' | 'air' | 'road' | 'rail';
  vesselOrFlightNo?: string;
  portOfLoading?: string;
  portOfDischarge?: string;
  chargeableWeight?: number;
  containerNo?: string;
  countryOfOrigin?: string;
  measurementUnit?: 'kg' | 'lb';
}

export interface GenerateResult {
  draftId: string;
  exportDocumentId: string;
  referenceNo: string;
  downloadUrl: string;
  memberDocumentId: string;
}

export interface ExportDocumentDraft {
  id: string;
  type: 'commercial_invoice' | 'packing_list';
  sellerName: string;
  sellerAddress: string;
  buyerName: string;
  buyerAddress: string;
  invoiceNumber: string | null;
  invoiceDate: string;
  destinationCountry: string;
  lineItems: LineItem[];
  notes: string | null;
  // Packing list shipment fields (null when not a packing list)
  shippingMethod: string | null;
  vesselOrFlightNo: string | null;
  portOfLoading: string | null;
  portOfDischarge: string | null;
  chargeableWeight: string | null;
  containerNo: string | null;
  countryOfOrigin: string | null;
  exportDocumentId: string | null;
  memberDocumentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const exportDocumentsApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    // Member: GET /export-documents
    getMyExportDocs: builder.query<ExportDocument[], void>({
      query: () => '/export-documents',
      transformResponse: (res: ApiListResponse<ExportDocument>) => res.data,
      providesTags: ['ExportDocuments'],
    }),

    // Member: POST /export-documents
    createExportDoc: builder.mutation<ExportDocument, CreateExportDocPayload>({
      query: (body) => ({ url: '/export-documents', method: 'POST', body }),
      transformResponse: (res: ApiSingleResponse<ExportDocument>) => res.data,
      invalidatesTags: ['ExportDocuments'],
    }),

    // Member: POST /export-documents/:id/download
    downloadExportDoc: builder.mutation<{ downloadUrl: string }, string>({
      query: (id) => ({ url: `/export-documents/${id}/download`, method: 'POST' }),
      transformResponse: (res: ApiSingleResponse<{ downloadUrl: string }>) => res.data,
      invalidatesTags: ['ExportDocuments'],
    }),

    // Admin: GET /export-documents/admin?page=&limit=&status=
    getAllExportDocs: builder.query<ExportDocument[], GetAllExportDocsArgs | void>({
      query: (args) => ({
        url: '/export-documents/admin',
        params: args
          ? {
              ...(args.page !== undefined ? { page: args.page } : {}),
              ...(args.limit !== undefined ? { limit: args.limit } : {}),
              ...(args.status !== undefined ? { status: args.status } : {}),
            }
          : undefined,
      }),
      transformResponse: (res: ApiListResponse<ExportDocument>) => res.data,
      providesTags: ['ExportDocuments'],
    }),

    // Admin: PATCH /export-documents/admin/:id — JSON body, draft→processing
    advanceToProcessing: builder.mutation<ExportDocument, { id: string; notes?: string }>({
      query: ({ id, notes }) => ({
        url: `/export-documents/admin/${id}`,
        method: 'PATCH',
        body: { status: 'processing', ...(notes !== undefined ? { notes } : {}) },
      }),
      transformResponse: (res: ApiSingleResponse<ExportDocument>) => res.data,
      invalidatesTags: ['ExportDocuments'],
    }),

    // Member: POST /export-documents/generate — self-service PDF generator
    generateExportDocument: builder.mutation<GenerateResult, GenerateExportDocPayload>({
      query: (body) => ({ url: '/export-documents/generate', method: 'POST', body }),
      transformResponse: (res: ApiSingleResponse<GenerateResult>) => res.data,
      invalidatesTags: ['ExportDocuments', 'Documents'],
    }),

    // Member: GET /export-documents/generate/:draftId — load draft for regeneration
    getExportDocDraft: builder.query<ExportDocumentDraft, string>({
      query: (draftId) => `/export-documents/generate/${draftId}`,
      transformResponse: (res: ApiSingleResponse<ExportDocumentDraft>) => res.data,
    }),

    // Member: DELETE /export-documents/:id — delete own document (draft or ready only)
    deleteExportDoc: builder.mutation<void, string>({
      query: (id) => ({ url: `/export-documents/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ExportDocuments', 'Documents'],
    }),

    // Admin: PATCH /export-documents/admin/:id — multipart/form-data, processing→ready
    markReady: builder.mutation<ExportDocument, { id: string; document: File; notes?: string }>({
      query: ({ id, document, notes }) => {
        const formData = new FormData();
        formData.append('status', 'ready');
        formData.append('document', document);
        if (notes) formData.append('notes', notes);
        return {
          url: `/export-documents/admin/${id}`,
          method: 'PATCH',
          body: formData,
          // Do not set Content-Type — browser sets it with the correct multipart boundary
          formData: true,
        };
      },
      transformResponse: (res: ApiSingleResponse<ExportDocument>) => res.data,
      invalidatesTags: ['ExportDocuments'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetMyExportDocsQuery,
  useCreateExportDocMutation,
  useDownloadExportDocMutation,
  useGetAllExportDocsQuery,
  useAdvanceToProcessingMutation,
  useMarkReadyMutation,
  useGenerateExportDocumentMutation,
  useGetExportDocDraftQuery,
  useDeleteExportDocMutation,
} = exportDocumentsApi;

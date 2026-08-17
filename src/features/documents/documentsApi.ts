import { emptyApi } from '@shared/api/emptyApi';

export type DocumentCategory =
  | 'commercial_invoice'
  | 'packing_list'
  | 'certificate_of_origin'
  | 'membership_card'
  | 'business_registration'
  | 'tax_clearance'
  | 'export_permit'
  | 'signature'
  | 'cac_certificate'
  | 'nepc_certificate'
  | 'other';

export interface Document {
  id: string;
  name: string;
  type: string;
  category: DocumentCategory;
  size: number;
  uploadedAt: string;
  url?: string;
}

interface ApiResponse<T> { success: boolean; data: T; }

export const documentsApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    getDocuments: builder.query<Document[], void>({
      query: () => '/membership/me/documents',
      transformResponse: (res: ApiResponse<Document[]>) => res.data,
      providesTags: ['Documents'],
    }),
    // Uploads a file to the member's document library and returns its record
    // (including a fresh presigned `url`) — the shared "upload once, get a
    // reference back" endpoint. Callers that need a file attached to some
    // other resource (e.g. an eCO application) should upload here first and
    // pass the returned `id` along, rather than attaching the raw file to
    // that resource's own create/update request.
    uploadDocument: builder.mutation<Document, FormData>({
      query: (body) => ({ url: '/membership/me/documents', method: 'POST', body, formData: true }),
      transformResponse: (res: ApiResponse<Document>) => res.data,
      invalidatesTags: ['Documents'],
    }),
    deleteDocument: builder.mutation<void, string>({
      query: (id) => ({ url: `/membership/me/documents/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Documents'],
    }),
    patchDocumentCategory: builder.mutation<{ id: string; category: string }, { id: string; category: DocumentCategory }>({
      query: ({ id, category }) => ({ url: `/membership/me/documents/${id}`, method: 'PATCH', body: { category } }),
      invalidatesTags: ['Documents'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetDocumentsQuery,
  useUploadDocumentMutation,
  useDeleteDocumentMutation,
  usePatchDocumentCategoryMutation,
} = documentsApi;

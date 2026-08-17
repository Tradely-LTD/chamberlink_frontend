import { emptyApi } from '@shared/api/emptyApi';

// ── Module keys ────────────────────────────────────────────────────────────

export const MODULE_KEYS = [
  'membership',
  'eco',
  'trade-fair',
  'exporter-visibility',
  'trade-corridors',
  'academy',
  'trade-intelligence',
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

// ── Types ─────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  region: string;
  rcNumber: string;
  status: 'active' | 'suspended' | 'trial';
  address: string | null;
  phone: string | null;
  email: string | null;
  logoKey: string | null;
  logoUrl: string | null;
  website: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  tagline: string | null;
  city: string | null;
  enabledModules: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantPayload {
  name: string;
  slug: string;
  region: string;
  rcNumber: string;
  primaryColor?: string;
  secondaryColor?: string;
  tagline?: string;
  city?: string;
  enabledModules?: string[];
  chamberAdminEmail: string;
  chamberAdminFirstName: string;
  chamberAdminLastName: string;
}

export interface UpdateTenantPayload {
  id: string;
  name?: string;
  region?: string;
  status?: 'active' | 'suspended' | 'trial';
  primaryColor?: string;
  secondaryColor?: string;
  tagline?: string;
  city?: string;
  enabledModules?: string[];
  logoKey?: string;
  website?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface UpdateMyTenantPayload {
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoKey?: string;
}

interface PaginatedTenantsResponse {
  success: boolean;
  data: Tenant[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface SingleTenantResponse {
  success: boolean;
  data: { tenantId: string; slug: string; chamberAdminUserId: string };
}

interface UpdateTenantResponse {
  success: boolean;
  data: Tenant;
}

// ── API ───────────────────────────────────────────────────────────────────

export const whiteLabelApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    getTenants: builder.query<
      { data: Tenant[]; pagination: PaginatedTenantsResponse['pagination'] },
      { page?: number; limit?: number; search?: string; status?: string } | void
    >({
      query: (params) => ({
        url: '/white-label/tenants',
        params: params ?? {},
      }),
      transformResponse: (res: PaginatedTenantsResponse) => ({
        data: res.data,
        pagination: res.pagination,
      }),
      providesTags: ['WhiteLabel'],
    }),

    createTenant: builder.mutation<
      { tenantId: string; slug: string; chamberAdminUserId: string },
      CreateTenantPayload
    >({
      query: (body) => ({ url: '/white-label/tenants', method: 'POST', body }),
      transformResponse: (res: SingleTenantResponse) => res.data,
      invalidatesTags: ['WhiteLabel'],
    }),

    updateTenant: builder.mutation<Tenant, UpdateTenantPayload>({
      query: ({ id, ...body }) => ({
        url: `/white-label/tenants/${id}`,
        method: 'PATCH',
        body,
      }),
      transformResponse: (res: UpdateTenantResponse) => res.data,
      invalidatesTags: ['WhiteLabel'],
    }),

    getMyTenant: builder.query<Tenant, void>({
      query: () => '/tenants/me',
      transformResponse: (res: { success: boolean; data: Tenant }) => res.data,
      providesTags: ['WhiteLabel'],
    }),

    updateMyTenant: builder.mutation<Tenant, UpdateMyTenantPayload>({
      query: (body) => ({ url: '/tenants/me', method: 'PATCH', body }),
      transformResponse: (res: { success: boolean; data: Tenant }) => res.data,
      invalidatesTags: ['WhiteLabel'],
    }),

    // Mirrors membershipApi's uploadLogo pattern (multipart, "logo" field) —
    // chamber_admin/super_admin self-service branding, called from
    // ProfilePage's "Organisation" card.
    uploadMyTenantLogo: builder.mutation<{ logoUrl: string }, FormData>({
      query: (body) => ({ url: '/tenants/me/logo', method: 'POST', body, formData: true }),
      transformResponse: (res: { success: boolean; data: { logoUrl: string } }) => res.data,
      invalidatesTags: ['WhiteLabel'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetTenantsQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  useGetMyTenantQuery,
  useUpdateMyTenantMutation,
  useUploadMyTenantLogoMutation,
} = whiteLabelApi;

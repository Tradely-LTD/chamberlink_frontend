import { emptyApi } from '@shared/api/emptyApi';

interface ApiResponse<T> { success: boolean; data: T; }

// The member's own profile on their active chamber connection
// (PUT/PATCH /membership/me). Personal fields are edited on My Profile,
// business fields on My Company.
const profileApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    updateProfile: builder.mutation<void, { firstName: string; lastName: string; phone?: string; businessName?: string }>({
      query: (body) => ({ url: '/membership/me', method: 'PUT', body }),
      invalidatesTags: ['Members'],
    }),
    patchProfile: builder.mutation<void, Record<string, string>>({
      query: (body) => ({ url: '/membership/me', method: 'PATCH', body }),
      invalidatesTags: ['Members'],
    }),
    uploadLogo: builder.mutation<{ logoUrl: string }, FormData>({
      query: (body) => ({ url: '/membership/me/profile/logo', method: 'POST', body, formData: true }),
      transformResponse: (res: ApiResponse<{ logoUrl: string }>) => res.data,
      invalidatesTags: ['Members'],
    }),
  }),
  overrideExisting: false,
});

export const { useUpdateProfileMutation, usePatchProfileMutation, useUploadLogoMutation } = profileApi;

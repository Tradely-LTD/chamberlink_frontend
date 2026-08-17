import { emptyApi } from '@shared/api/emptyApi';

interface ApiResponse<T> { success: boolean; data: T; }

export interface PlatformSetting {
  key: string;
  label: string;
  description: string;
  defaultValue: string;
  type: 'percent' | 'number' | 'string';
  value: string;
}

export const settingsApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    getSettings: builder.query<PlatformSetting[], void>({
      query: () => '/admin/settings',
      transformResponse: (res: ApiResponse<PlatformSetting[]>) => res.data,
      providesTags: ['PlatformSettings'],
    }),
    updateSetting: builder.mutation<PlatformSetting[], { key: string; value: string }>({
      query: ({ key, value }) => ({ url: `/admin/settings/${key}`, method: 'PATCH', body: { value } }),
      transformResponse: (res: ApiResponse<PlatformSetting[]>) => res.data,
      invalidatesTags: ['PlatformSettings'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetSettingsQuery, useUpdateSettingMutation } = settingsApi;

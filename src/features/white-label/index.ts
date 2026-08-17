export {
  whiteLabelApi,
  useGetTenantsQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  useGetMyTenantQuery,
  useUpdateMyTenantMutation,
  useUploadMyTenantLogoMutation,
  MODULE_KEYS,
} from './whiteLabelApi';

export type {
  Tenant,
  CreateTenantPayload,
  UpdateTenantPayload,
  UpdateMyTenantPayload,
  ModuleKey,
} from './whiteLabelApi';

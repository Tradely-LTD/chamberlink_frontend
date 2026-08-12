/**
 * Chamber connections — the multi-chamber ChamberLink identity model.
 *
 * A ChamberLink identity is global and chamber-independent; chamber membership
 * is zero-to-many "connections" a user explicitly adds over time, each with
 * its own status/tier/dues. These endpoints sit under authMiddleware only —
 * no role restriction, since a staff_operator can also personally be a member
 * of a different chamber.
 */
import { emptyApi } from '@shared/api/emptyApi';
import { updateUser } from '@features/auth/authSlice';
import type { ChamberConnection } from '@entities/user/types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export type ConnectAction = 'created' | 'noop' | 'reactivated';

/** Raw member_profiles row returned by POST /membership/connections. */
export interface ConnectionResult {
  id: string;
  tenantId: string;
  status: 'pending_payment' | 'active' | 'expired' | 'suspended';
  memberId: string;
  tierId: string;
  memberSince?: string | null;
  expiresAt?: string | null;
}

export interface OnboardedChamber {
  id: string;
  name: string;
  slug: string;
  city?: string | null;
}

export const connectionsApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyConnections: builder.query<ChamberConnection[], void>({
      query: () => '/membership/connections',
      transformResponse: (res: ApiResponse<ChamberConnection[]>) => res.data,
      providesTags: ['ChamberConnections'],
    }),

    // 201 (created) / 200 (noop | reactivated) — the backend puts the action in
    // `message`, so we don't need to inspect the HTTP status ourselves.
    connectToChamber: builder.mutation<
      { connection: ConnectionResult; action: ConnectAction },
      { tenantId: string }
    >({
      query: (body) => ({ url: '/membership/connections', method: 'POST', body }),
      transformResponse: (res: ApiResponse<ConnectionResult>) => ({
        connection: res.data,
        action: (res.message ?? 'created') as ConnectAction,
      }),
      invalidatesTags: ['ChamberConnections', 'Membership'],
    }),

    switchActiveChamber: builder.mutation<{ message: string }, { tenantId: string }>({
      query: (body) => ({ url: '/membership/connections/active', method: 'PATCH', body }),
      transformResponse: (res: ApiResponse<undefined>) => ({
        message: res.message ?? 'Active chamber switched',
      }),
      invalidatesTags: ['ChamberConnections', 'Membership'],
      onQueryStarted: async ({ tenantId }, { dispatch, queryFulfilled }) => {
        try {
          await queryFulfilled;
          // Reuse the existing authSlice action so the header/sidebar/guards
          // reflect the new active chamber immediately, without waiting on the
          // next /auth/me refresh.
          dispatch(updateUser({ activeTenantId: tenantId }));
        } catch {
          // Mutation error is surfaced to the caller via .unwrap() — nothing
          // else to do here.
        }
      },
    }),

    removeConnection: builder.mutation<{ message: string }, { tenantId: string }>({
      query: ({ tenantId }) => ({ url: `/membership/connections/${tenantId}`, method: 'DELETE' }),
      transformResponse: (res: ApiResponse<undefined>) => ({
        message: res.message ?? 'Disconnected from chamber',
      }),
      invalidatesTags: ['ChamberConnections', 'Membership'],
    }),

    // Public, unauthenticated-safe list of active tenants for the "connect a new
    // chamber" picker.
    //
    // NOTE (frontend-builder, multi-chamber identity feature): as of this
    // writing the backend (branch feature/multi-chamber-identity) does NOT
    // expose this endpoint anywhere — neither reused from `GET
    // /tenants/public/:slug` (that's a single-tenant lookup by slug, not a
    // list) nor as a new route. Verified by reading
    // chamberlink_backend/src/modules/tenants/route.ts and
    // chamberlink_backend/src/modules/membership/route.ts directly; neither
    // has anything resembling a public multi-tenant listing endpoint. This is
    // a real API-contract gap, not an assumption — see handoff notes.
    //
    // Wired to the path implied by the brief and consistent with the existing
    // `/tenants/public/:slug` naming so this flips on with zero frontend
    // changes once the backend adds it. Until then this 404s and the modal
    // shows its existing error state with Retry.
    getOnboardedChambers: builder.query<OnboardedChamber[], void>({
      query: () => '/tenants/public/onboarded',
      transformResponse: (res: ApiResponse<OnboardedChamber[]>) => res.data,
    }),
  }),
});

export const {
  useGetMyConnectionsQuery,
  useConnectToChamberMutation,
  useSwitchActiveChamberMutation,
  useRemoveConnectionMutation,
  useGetOnboardedChambersQuery,
} = connectionsApi;

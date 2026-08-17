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
  logoUrl?: string | null;
}

export interface RosterPreview {
  firstNameMasked: string;
  businessName: string | null;
  tierName: string | null;
  memberSince: string | null;
}

export interface RosterCheckResult {
  matched: boolean;
  preview?: RosterPreview;
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
    // chamber" picker. Live on the backend at GET /tenants/public/onboarded
    // (chamberlink_backend/src/modules/tenants/route.ts) — confirmed by the
    // backend-builder for the Chamber Network feature.
    getOnboardedChambers: builder.query<OnboardedChamber[], void>({
      query: () => '/tenants/public/onboarded',
      transformResponse: (res: ApiResponse<OnboardedChamber[]>) => res.data,
    }),

    // Chamber Network — connect via a known/legacy roster ID, checked against
    // a chamber's uploaded roster (chamber_roster_entries). Two-step flow:
    // 1) checkRoster (read-only preview, no invalidation) 2) connectViaRoster
    // (the actual claim). The preview intentionally does NOT guarantee the
    // claim will succeed — someone else may claim the same row in between, so
    // the claim step still needs to handle its own 404/409s.
    checkRoster: builder.mutation<RosterCheckResult, { tenantId: string; legacyMemberId: string }>({
      query: (body) => ({ url: '/membership/connections/roster/check', method: 'POST', body }),
      transformResponse: (res: ApiResponse<RosterCheckResult>) => res.data,
    }),

    connectViaRoster: builder.mutation<ConnectionResult, { tenantId: string; legacyMemberId: string }>({
      query: (body) => ({ url: '/membership/connections/roster', method: 'POST', body }),
      transformResponse: (res: ApiResponse<ConnectionResult>) => res.data,
      invalidatesTags: ['ChamberConnections', 'Membership'],
    }),
  }),
});

export const {
  useGetMyConnectionsQuery,
  useConnectToChamberMutation,
  useSwitchActiveChamberMutation,
  useRemoveConnectionMutation,
  useGetOnboardedChambersQuery,
  useCheckRosterMutation,
  useConnectViaRosterMutation,
} = connectionsApi;

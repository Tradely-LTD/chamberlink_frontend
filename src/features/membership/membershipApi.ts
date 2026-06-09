import { emptyApi } from '@shared/api/emptyApi';
import type { MembershipTier } from '@entities/membership/types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface MembershipStatus {
  status: 'pending_payment' | 'active' | 'expired' | 'suspended';
  tierId?: string;
  tierName?: string;
  memberSince?: string;
  expiresAt?: string;
  memberId?: string;
}

interface MemberProfileRaw {
  profile: {
    memberId: string;
    tierId: string;
    status: MembershipStatus['status'];
    memberSince?: string;
    expiresAt?: string;
  };
  tier: { id: string; name: string; annualFee: number };
  email: string;
}

export const membershipApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    getMembershipTiers: builder.query<MembershipTier[], void>({
      query: () => '/membership/tiers',
      transformResponse: (res: ApiResponse<MembershipTier[]>) => res.data,
    }),
    getMembershipStatus: builder.query<MembershipStatus, void>({
      query: () => '/membership/me',
      transformResponse: (res: ApiResponse<MemberProfileRaw>): MembershipStatus => ({
        status: res.data.profile.status,
        tierId: res.data.profile.tierId,
        tierName: res.data.tier?.name,
        memberSince: res.data.profile.memberSince,
        expiresAt: res.data.profile.expiresAt,
        memberId: res.data.profile.memberId,
      }),
    }),
  }),
});

export const {
  useGetMembershipTiersQuery,
  useGetMembershipStatusQuery,
} = membershipApi;

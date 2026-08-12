import { emptyApi } from '@shared/api/emptyApi';
import type { MemberProfile } from '@entities/user/types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface MemberProfileRaw {
  profile: {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    businessName?: string;
    memberId: string;
    tierId: string;
    status: 'pending_payment' | 'active' | 'expired' | 'suspended';
    memberSince?: string;
    expiresAt?: string;
    registrationNumber?: string;
    industry?: string;
    address?: string;
    city?: string;
    state?: string;
    website?: string;
    logoKey?: string;
    logoUrl?: string;
  };
  tier: { id: string; name: string; annualFee: number };
  email: string;
  phone?: string;
}

export const dashboardApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    getMemberProfile: builder.query<MemberProfile, void>({
      query: () => '/membership/me',
      transformResponse: (res: ApiResponse<MemberProfileRaw>): MemberProfile => ({
        id: res.data.profile.id,
        userId: res.data.profile.userId,
        firstName: res.data.profile.firstName,
        lastName: res.data.profile.lastName,
        businessName: res.data.profile.businessName,
        memberId: res.data.profile.memberId,
        tierId: res.data.profile.tierId,
        status: res.data.profile.status,
        membershipExpiresAt: res.data.profile.expiresAt,
        registrationNumber: res.data.profile.registrationNumber,
        industry: res.data.profile.industry,
        address: res.data.profile.address,
        city: res.data.profile.city,
        state: res.data.profile.state,
        website: res.data.profile.website,
        logoKey: res.data.profile.logoKey,
        logoUrl: res.data.profile.logoUrl,
      }),
      providesTags: ['Membership'],
    }),
  }),
});

export const { useGetMemberProfileQuery } = dashboardApi;

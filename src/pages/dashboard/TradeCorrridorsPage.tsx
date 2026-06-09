import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { emptyApi } from '@shared/api/emptyApi';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { Button } from '@shared/ui/Button';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { useAppSelector } from '@shared/hooks/useAppDispatch';

// ── Types ─────────────────────────────────────────────────────────────────

interface TradeCorridorSponsor {
  id: string;
  companyName: string;
  tier: 'gold' | 'silver' | 'bronze';
}

interface TradeCorridor {
  id: string;
  title: string;
  origin: string;
  destination: string;
  category: string;
  description: string;
  status: 'active' | 'inactive' | 'upcoming';
  memberCount: number;
  tradeVolume?: string;
  sponsors: TradeCorridorSponsor[];
  sponsorSlotsAvailable: number;
  sponsorPriceGold: number;
  sponsorPriceSilver: number;
  isFollowing?: boolean;
}

interface SponsorApplication {
  id: string;
  corridorId: string;
  corridorTitle: string;
  companyName: string;
  tier: 'gold' | 'silver';
  status: 'pending_payment' | 'pending_review' | 'approved' | 'rejected';
  createdAt: string;
  // legacy alias kept for UI compatibility
  appliedAt?: string;
  amount: number;
  paymentRef?: string | null;
  memberName?: string;
  memberEmail?: string;
}

interface CorridorMembershipItem {
  corridorId: string;
  corridorTitle: string;
  joinedAt: string;
  source: 'manual' | 'eco-auto';
}

interface CorridorMemberRow {
  id: string;
  name: string;
  companyName: string | null;
  memberId: string;
  joinedAt: string;
  source: 'manual' | 'eco-auto';
}

interface CorridorMembersResponse {
  data: CorridorMemberRow[];
  total: number;
}

interface ApiResponse<T> { success: boolean; data: T; }
interface PaymentResult { authorizationUrl: string; reference: string; }

// ── API ───────────────────────────────────────────────────────────────────

const corridorsApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    getTradeCorridors: builder.query<TradeCorridor[], void>({
      query: () => '/trade-corridors',
      transformResponse: (res: ApiResponse<TradeCorridor[]>) => res.data,
      providesTags: ['TradeCorridors'],
    }),
    getMyCorridorApplications: builder.query<SponsorApplication[], void>({
      query: () => '/trade-corridors/applications',
      transformResponse: (res: ApiResponse<SponsorApplication[]>) => res.data,
      providesTags: ['TradeCorridors'],
    }),
    getAllCorridorApplications: builder.query<SponsorApplication[], void>({
      query: () => '/trade-corridors/admin/applications',
      transformResponse: (res: ApiResponse<SponsorApplication[]>) => res.data,
      providesTags: ['TradeCorridors'],
    }),
    applyCorridorSponsor: builder.mutation<PaymentResult, { corridorId: string; tier: 'gold' | 'silver' }>({
      query: (body) => ({
        url: '/trade-corridors/sponsor',
        method: 'POST',
        body: { ...body, callbackUrl: `${window.location.origin}/dashboard/trade-corridors` },
      }),
      transformResponse: (res: ApiResponse<PaymentResult>) => res.data,
      invalidatesTags: ['TradeCorridors'],
    }),
    verifyCorridorSponsor: builder.mutation<{ status: string; confirmed: boolean }, string>({
      query: (reference) => ({ url: '/trade-corridors/sponsor/verify', params: { reference } }),
      transformResponse: (res: ApiResponse<{ status: string; confirmed: boolean }>) => res.data,
      invalidatesTags: ['TradeCorridors'],
    }),
    updateCorridorApplication: builder.mutation<void, { id: string; status: 'approved' | 'rejected' }>({
      query: ({ id, ...body }) => ({ url: `/trade-corridors/admin/applications/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['TradeCorridors'],
    }),
    getMyCorridorMemberships: builder.query<CorridorMembershipItem[], void>({
      query: () => '/trade-corridors/my-memberships',
      transformResponse: (res: ApiResponse<CorridorMembershipItem[]>) => res.data,
      providesTags: ['TradeCorridors'],
    }),
    joinCorridor: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({ url: `/trade-corridors/${id}/join`, method: 'POST' }),
      invalidatesTags: ['TradeCorridors'],
    }),
    leaveCorridor: builder.mutation<{ success: boolean; message: string }, string>({
      query: (id) => ({ url: `/trade-corridors/${id}/leave`, method: 'DELETE' }),
      invalidatesTags: ['TradeCorridors'],
    }),
    getCorridorMembers: builder.query<CorridorMembersResponse, { corridorId: string; page: number }>({
      query: ({ corridorId, page }) => `/trade-corridors/${corridorId}/members?page=${page}&limit=20`,
      transformResponse: (res: { success: boolean; data: CorridorMemberRow[]; total: number }) => ({
        data: res.data,
        total: res.total,
      }),
      providesTags: ['TradeCorridors'],
    }),
    getAdminCorridors: builder.query<TradeCorridor[], void>({
      query: () => '/trade-corridors/admin',
      transformResponse: (res: ApiResponse<TradeCorridor[]>) => res.data,
      providesTags: ['TradeCorridors'],
    }),
    createCorridor: builder.mutation<TradeCorridor, Partial<TradeCorridor>>({
      query: (body) => ({ url: '/trade-corridors/admin', method: 'POST', body }),
      transformResponse: (res: ApiResponse<TradeCorridor>) => res.data,
      invalidatesTags: ['TradeCorridors'],
    }),
    updateCorridor: builder.mutation<TradeCorridor, { id: string } & Partial<TradeCorridor>>({
      query: ({ id, ...body }) => ({ url: `/trade-corridors/admin/${id}`, method: 'PATCH', body }),
      transformResponse: (res: ApiResponse<TradeCorridor>) => res.data,
      invalidatesTags: ['TradeCorridors'],
    }),
  }),
  overrideExisting: false,
});

const {
  useGetTradeCorridorsQuery,
  useGetMyCorridorApplicationsQuery,
  useGetAllCorridorApplicationsQuery,
  useApplyCorridorSponsorMutation,
  useUpdateCorridorApplicationMutation,
  useGetMyCorridorMembershipsQuery,
  useJoinCorridorMutation,
  useLeaveCorridorMutation,
  useGetCorridorMembersQuery,
  useGetAdminCorridorsQuery,
  useCreateCorridorMutation,
  useUpdateCorridorMutation,
  useVerifyCorridorSponsorMutation,
} = corridorsApi;

// ── Demo data ─────────────────────────────────────────────────────────────

const demoCorridors: TradeCorridor[] = [
  { id: 'c1', title: 'Nigeria — China Trade Corridor', origin: 'Kano, Nigeria', destination: 'Guangzhou, China', category: 'Manufacturing & Textiles', description: 'Facilitating exports of leather, hides, and agricultural products to China, with return imports of machinery and electronics.', status: 'active', memberCount: 214, tradeVolume: '$42M / year', sponsors: [{ id: 's1', companyName: 'Dantata & Sawoe Ltd', tier: 'gold' }, { id: 's2', companyName: 'Kano Textile Mills', tier: 'silver' }], sponsorSlotsAvailable: 1, sponsorPriceGold: 500000, sponsorPriceSilver: 250000, isFollowing: true },
  { id: 'c2', title: 'Nigeria — UAE Trade Corridor', origin: 'Kano, Nigeria', destination: 'Dubai, UAE', category: 'Agriculture & Food', description: 'Promoting Nigerian groundnuts, sesame seeds, and shea butter to the Gulf market and connecting Nigerian businesses to UAE investors.', status: 'active', memberCount: 178, tradeVolume: '$28M / year', sponsors: [{ id: 's3', companyName: 'Arewa Agro Exports', tier: 'gold' }], sponsorSlotsAvailable: 2, sponsorPriceGold: 500000, sponsorPriceSilver: 250000, isFollowing: false },
  { id: 'c3', title: 'Nigeria — UK Trade Corridor', origin: 'Kano, Nigeria', destination: 'London, UK', category: 'Creative & Cultural Goods', description: 'Connecting Northern Nigerian artisans, leather craftsmen, and cultural goods exporters to UK buyers and diaspora markets.', status: 'active', memberCount: 132, tradeVolume: '$12M / year', sponsors: [], sponsorSlotsAvailable: 3, sponsorPriceGold: 500000, sponsorPriceSilver: 250000, isFollowing: false },
  { id: 'c4', title: 'Nigeria — West Africa Intra-Regional', origin: 'Kano, Nigeria', destination: 'Accra / Abidjan / Dakar', category: 'ECOWAS Free Trade', description: 'Leveraging ECOWAS protocols to facilitate preferential-tariff trade across West Africa for KACCIMA members.', status: 'upcoming', memberCount: 0, sponsors: [], sponsorSlotsAvailable: 3, sponsorPriceGold: 350000, sponsorPriceSilver: 175000, isFollowing: false },
];

const demoMyApplications: SponsorApplication[] = [
  { id: 'a1', corridorId: 'c1', corridorTitle: 'Nigeria — China Trade Corridor', companyName: 'My Company Ltd', tier: 'silver', status: 'approved', appliedAt: '2025-02-10T00:00:00Z', amount: 250000 },
];

const demoAllApplications: SponsorApplication[] = [
  { id: 'a1', corridorId: 'c1', corridorTitle: 'Nigeria — China Trade Corridor', companyName: 'My Company Ltd', tier: 'silver', status: 'approved', appliedAt: '2025-02-10T00:00:00Z', amount: 250000, memberName: 'Amina Musa' },
  { id: 'a2', corridorId: 'c3', corridorTitle: 'Nigeria — UK Trade Corridor', companyName: 'Kano Export House', tier: 'gold', status: 'pending', appliedAt: '2025-04-01T00:00:00Z', amount: 500000, memberName: 'Ibrahim Dantata' },
];

const demoMyMemberships: CorridorMembershipItem[] = [
  { corridorId: 'c1', corridorTitle: 'Nigeria — China Trade Corridor', joinedAt: '2025-03-15T00:00:00Z', source: 'manual' },
  { corridorId: 'c2', corridorTitle: 'Nigeria — UAE Trade Corridor', joinedAt: '2025-04-20T00:00:00Z', source: 'eco-auto' },
];

const demoCorridorMembers: CorridorMemberRow[] = [
  { id: 'm1', name: 'Amina Musa', companyName: 'Arewa Exports Ltd', memberId: 'KAC-2024-001', joinedAt: '2025-03-01T00:00:00Z', source: 'manual' },
  { id: 'm2', name: 'Ibrahim Dantata', companyName: 'Dantata Trading Co', memberId: 'KAC-2024-002', joinedAt: '2025-04-10T00:00:00Z', source: 'eco-auto' },
];

const tierConfig = {
  gold:   { label: 'Gold',   bg: '#ffdea5', text: '#5d4201', accent: '#c5a059' },
  silver: { label: 'Silver', bg: '#e0e3e5', text: '#44474e', accent: '#74777f' },
  bronze: { label: 'Bronze', bg: '#ffdad6', text: '#93000a', accent: '#ba1a1a' },
};

const corridorStatusConfig = {
  active:   { label: 'Active',   bg: '#a0f4ca', text: '#005137' },
  inactive: { label: 'Inactive', bg: '#e0e3e5', text: '#44474e' },
  upcoming: { label: 'Upcoming', bg: '#ffdea5', text: '#5d4201' },
};

const appStatusConfig: Record<string, { label: string; bg: string; text: string }> = {
  pending_payment: { label: 'Awaiting Payment', bg: '#e0e3e5', text: '#44474e' },
  pending_review:  { label: 'Under Review',     bg: '#ffdea5', text: '#5d4201' },
  approved:        { label: 'Approved',          bg: '#a0f4ca', text: '#005137' },
  rejected:        { label: 'Rejected',          bg: '#ffdad6', text: '#93000a' },
};

const ADMIN_ROLES = ['chamber_admin', 'kaccima_executive', 'super_admin', 'staff_operator'];

// ── Sponsor Modal ─────────────────────────────────────────────────────────

function SponsorModal({ corridor, onClose }: { corridor: TradeCorridor; onClose: () => void }) {
  const [apply, { isLoading }] = useApplyCorridorSponsorMutation();
  const [tier, setTier] = useState<'gold' | 'silver'>('silver');
  const [error, setError] = useState<string | null>(null);

  const price = tier === 'gold' ? corridor.sponsorPriceGold : corridor.sponsorPriceSilver;

  const handleApply = async () => {
    setError(null);
    try {
      const result = await apply({ corridorId: corridor.id, tier }).unwrap();
      window.location.href = result.authorizationUrl;
    } catch {
      setError('Application failed. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="border-b border-[#e0e3e5] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-[#191c1e]">Apply for Sponsorship</h2>
            <p className="text-xs text-[#74777f] mt-0.5">{corridor.title}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#f7f9fb] text-[#74777f]">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <div className="p-6 space-y-4">
          {error && <ErrorBanner message={error} />}
          {(['gold', 'silver'] as const).map((t) => {
            const tc = tierConfig[t];
            const p = t === 'gold' ? corridor.sponsorPriceGold : corridor.sponsorPriceSilver;
            return (
              <button key={t} onClick={() => setTier(t)} className={`w-full rounded-xl border-2 p-4 text-left transition-all ${tier === t ? '' : 'border-[#e0e3e5]'}`}
                style={tier === t ? { borderColor: tc.accent, background: tc.bg + '50' } : {}}>
                <div className="flex items-center justify-between mb-1">
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: tc.bg, color: tc.text }}>{tc.label} Sponsor</span>
                  <span className="font-bold text-[#191c1e]">₦{p.toLocaleString()}/yr</span>
                </div>
                <p className="text-xs text-[#74777f]">{t === 'gold' ? 'Top placement, featured in newsletters, corridor logo rights.' : 'Secondary listing, directory placement, corridor badge.'}</p>
              </button>
            );
          })}
          <div className="rounded-xl border border-[#e0e3e5] p-4 bg-[#f7f9fb]">
            <p className="text-xs text-[#74777f]">Sponsorship status is granted on verified payment confirmation only. Annual renewal required.</p>
            <div className="flex justify-between text-sm font-semibold mt-2">
              <span className="text-[#74777f]">Amount due</span>
              <span className="text-[#191c1e]">₦{price.toLocaleString()}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <button disabled={isLoading} onClick={handleApply}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: '#002046' }}>
              {isLoading ? 'Processing…' : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>payments</span>Proceed to Payment</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Member View ────────────────────────────────────────────────────────────

function MemberCorridorsView() {
  const { data: corridors, isLoading, isError: corridorsError } = useGetTradeCorridorsQuery();
  const { data: myApps, isLoading: appsLoading } = useGetMyCorridorApplicationsQuery();
  const { data: myMemberships, isLoading: membershipsLoading } = useGetMyCorridorMembershipsQuery();
  const [join] = useJoinCorridorMutation();
  const [leave] = useLeaveCorridorMutation();
  const [verifyCorridorSponsor, { isLoading: verifying }] = useVerifyCorridorSponsorMutation();

  const [tab, setTab] = useState<'corridors' | 'my-activity'>('corridors');
  const [sponsorCorridor, setSponsorCorridor] = useState<TradeCorridor | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [followError, setFollowError] = useState<string | null>(null);
  const [sponsorMsg, setSponsorMsg] = useState<{ confirmed: boolean } | null>(null);

  // Payment callback: Paystack redirects back with ?reference=
  const [searchParams, setSearchParams] = useSearchParams();
  const callbackRef = searchParams.get('reference') ?? searchParams.get('trxref') ?? null;
  const verifyFired = useRef(false);

  useEffect(() => {
    if (!callbackRef || verifyFired.current) return;
    verifyFired.current = true;
    verifyCorridorSponsor(callbackRef)
      .unwrap()
      .then((r) => setSponsorMsg({ confirmed: r.confirmed }))
      .catch(() => setSponsorMsg({ confirmed: false }))
      .finally(() => {
        setSearchParams({}, { replace: true });
        setTab('my-activity');
      });
  }, [callbackRef, verifyCorridorSponsor, setSearchParams]);

  const handleJoin = async (corridorId: string) => {
    setFollowError(null);
    setJoiningId(corridorId);
    try {
      await join(corridorId).unwrap();
    } catch (err: unknown) {
      const e = err as { status?: number | string; data?: { message?: string } };
      if (e?.status === 409) {
        // Already following — ignore, list will refresh
      } else if (e?.status === 403) {
        setFollowError('Permission denied (403). Make sure your account has member role.');
      } else if (e?.status === 404) {
        setFollowError('Corridor not found (404). Try refreshing the page.');
      } else if (e?.status === 400) {
        setFollowError(`Cannot follow this corridor: ${e?.data?.message ?? 'inactive or unavailable'}.`);
      } else {
        setFollowError(`Failed to follow corridor (${e?.status ?? 'network error'}). Please try again.`);
      }
    } finally {
      setJoiningId(null);
    }
  };

  const handleLeave = async (corridorId: string) => {
    setFollowError(null);
    setLeavingId(corridorId);
    try {
      await leave(corridorId).unwrap();
    } catch {
      setFollowError('Failed to unfollow corridor. Please try again.');
    } finally {
      setLeavingId(null);
    }
  };

  // Only use demo data while loading — never on error (fake IDs cause 404 on follow)
  const allCorridors = corridors ?? (isLoading ? demoCorridors : []);
  const apps = myApps ?? [];
  const memberships = myMemberships ?? [];

  return (
    <div className="p-6 max-w-4xl">
      {sponsorCorridor && <SponsorModal corridor={sponsorCorridor} onClose={() => setSponsorCorridor(null)} />}

      {/* DB / network error — shown instead of fake demo data */}
      {corridorsError && !isLoading && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#ffdad6] bg-[#fff5f5] px-4 py-3 text-sm text-[#93000a]">
          <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 18, fontVariationSettings: `'FILL' 1` }}>wifi_off</span>
          Could not load corridors — check your connection and <button onClick={() => window.location.reload()} className="underline font-semibold ml-1">refresh</button>.
        </div>
      )}

      {/* Payment verification banners */}
      {verifying && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#d6e3ff] bg-[#f0f4ff] px-4 py-3 text-sm text-[#002046]">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#002046] border-t-transparent flex-shrink-0" />
          Verifying your sponsorship payment…
        </div>
      )}
      {sponsorMsg && !verifying && (
        <div
          className="mb-4 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm"
          style={sponsorMsg.confirmed
            ? { borderColor: '#a0f4ca', background: '#f0fdf6', color: '#005137' }
            : { borderColor: '#ffdea5', background: '#fffbf0', color: '#5d4201' }}
        >
          <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 18, fontVariationSettings: `'FILL' 1` }}>
            {sponsorMsg.confirmed ? 'check_circle' : 'info'}
          </span>
          {sponsorMsg.confirmed
            ? 'Payment received! Your sponsorship application is under review.'
            : 'Payment is being processed. Your application will appear once confirmed.'}
        </div>
      )}
      {followError && (
        <div className="mb-4"><ErrorBanner message={followError} /></div>
      )}

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#191c1e]">Sponsored Trade Corridors</h2>
        <p className="text-sm text-[#74777f] mt-0.5">Explore active trade routes and sponsor a corridor to boost your business visibility globally.</p>
      </div>

      {/* How it works banner */}
      <div className="rounded-xl border border-[#002046]/20 bg-[#002046]/5 p-4 mb-6 flex items-start gap-3">
        <span className="material-symbols-outlined flex-shrink-0 mt-0.5" style={{ fontSize: 20, color: '#002046', fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20` }}>info</span>
        <div>
          <p className="text-sm font-semibold text-[#191c1e] mb-1">How sponsorships work</p>
          <ol className="text-xs text-[#74777f] space-y-0.5 list-decimal list-inside">
            <li>Pick a corridor below and click <strong>Become a Sponsor</strong>.</li>
            <li>Choose Gold or Silver tier, then proceed to our secure payment gateway (Paystack / Flutterwave).</li>
            <li>Once payment is confirmed your company name and badge appear on the corridor — visible to all KACCIMA members and exporters.</li>
          </ol>
        </div>
      </div>

      <div className="flex gap-1 bg-[#f7f9fb] rounded-lg p-1 mb-6 w-fit border border-[#e0e3e5]">
        {([['corridors', 'All Corridors'], ['my-activity', 'My Activity']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-[#191c1e] shadow-sm' : 'text-[#74777f] hover:text-[#191c1e]'}`}>
            {label}
            {t === 'my-activity' && (memberships.length + apps.length) > 0 && <span className="ml-1.5 rounded-full px-1.5 py-0.5 text-xs text-white font-bold" style={{ background: '#002046' }}>{memberships.length + apps.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'corridors' && (
        <>
          {isLoading && <SkeletonCard />}
          <div className="space-y-4">
            {allCorridors.map((c) => {
              const st = corridorStatusConfig[c.status];
              const canSponsor = c.sponsorSlotsAvailable > 0 && c.status !== 'inactive';
              return (
                <div key={c.id} className="bg-white rounded-xl border border-[#e0e3e5] overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="text-base font-bold text-[#191c1e]">{c.title}</h3>
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: st.bg, color: st.text }}>{st.label}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-[#74777f] flex-wrap">
                          <span className="flex items-center gap-1"><span className="material-symbols-outlined" style={{ fontSize: 14 }}>route</span>{c.origin} → {c.destination}</span>
                          <span className="flex items-center gap-1"><span className="material-symbols-outlined" style={{ fontSize: 14 }}>category</span>{c.category}</span>
                          {c.tradeVolume && <span className="flex items-center gap-1"><span className="material-symbols-outlined" style={{ fontSize: 14 }}>trending_up</span>{c.tradeVolume}</span>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-2xl font-bold text-[#002046]">{c.memberCount}</p>
                        <p className="text-xs text-[#74777f]">members</p>
                      </div>
                    </div>
                    <p className="text-sm text-[#74777f] mb-4">{c.description}</p>

                    {/* Current sponsors */}
                    {c.sponsors.length > 0 && (
                      <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <p className="text-xs font-semibold text-[#74777f] uppercase tracking-wide">Current sponsors:</p>
                        {c.sponsors.map((s) => (
                          <span key={s.id} className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: tierConfig[s.tier].bg, color: tierConfig[s.tier].text }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 11, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 11` }}>workspace_premium</span>
                            {s.companyName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Follow/Unfollow row */}
                  <div className="px-6 pb-4 flex items-center gap-3">
                    {c.isFollowing ? (
                      <button
                        disabled={leavingId === c.id}
                        onClick={() => handleLeave(c.id)}
                        className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium border border-[#e0e3e5] bg-white text-[#74777f] hover:bg-[#f7f9fb] disabled:opacity-50 transition-colors"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>bookmark_remove</span>
                        {leavingId === c.id ? 'Unfollowing…' : 'Unfollow'}
                      </button>
                    ) : (
                      <button
                        disabled={joiningId === c.id}
                        onClick={() => handleJoin(c.id)}
                        className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium border border-[#002046]/30 bg-[#002046]/5 text-[#002046] hover:bg-[#002046]/10 disabled:opacity-50 transition-colors"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>bookmark_add</span>
                        {joiningId === c.id ? 'Following…' : 'Follow Corridor'}
                      </button>
                    )}
                    <span className="text-xs text-[#74777f]">{c.memberCount} member{c.memberCount !== 1 ? 's' : ''}</span>
                  </div>

                  {/* Sponsor CTA — full-width tinted footer */}
                  {canSponsor && (
                    <div className="border-t border-[#e0e3e5] bg-[#f7f9fb] px-6 py-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold text-[#191c1e]">{c.sponsorSlotsAvailable} sponsorship slot{c.sponsorSlotsAvailable > 1 ? 's' : ''} open</p>
                        <p className="text-xs text-[#74777f] mt-0.5">
                          Silver ₦{c.sponsorPriceSilver.toLocaleString()}/yr · Gold ₦{c.sponsorPriceGold.toLocaleString()}/yr
                        </p>
                      </div>
                      <button onClick={() => setSponsorCorridor(c)}
                        className="flex-shrink-0 flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
                        style={{ background: '#002046' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>workspace_premium</span>
                        Become a Sponsor
                      </button>
                    </div>
                  )}
                  {!canSponsor && c.status === 'upcoming' && (
                    <div className="border-t border-[#e0e3e5] bg-[#ffdea5]/20 px-6 py-3">
                      <p className="text-xs text-[#5d4201]">Sponsorships open when this corridor launches.</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === 'my-activity' && (
        <div className="space-y-6">
          {/* Corridors I Follow */}
          <div>
            <p className="text-xs font-semibold text-[#74777f] uppercase tracking-wide mb-3">Corridors I Follow</p>
            {memberships.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#e0e3e5] p-10 text-center">
                <p className="text-sm text-[#74777f] mb-4">You are not following any corridors yet.</p>
                <button onClick={() => setTab('corridors')} className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white" style={{ background: '#002046' }}>Browse Corridors</button>
              </div>
            ) : (
              <div className="space-y-2">
                {memberships.map((m) => (
                  <div key={m.corridorId} className="bg-white rounded-xl border border-[#e0e3e5] px-5 py-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-sm text-[#191c1e]">{m.corridorTitle}</p>
                      <p className="text-xs text-[#74777f] mt-0.5">
                        Joined {new Date(m.joinedAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold flex-shrink-0"
                      style={m.source === 'eco-auto' ? { background: '#a0f4ca', color: '#005137' } : { background: '#e0e3e5', color: '#44474e' }}>
                      {m.source === 'eco-auto' ? 'Added via eCO' : 'Joined manually'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sponsorship Applications */}
          <div>
            <p className="text-xs font-semibold text-[#74777f] uppercase tracking-wide mb-3">My Sponsorship Applications</p>
            {apps.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#e0e3e5] p-10 text-center">
                <p className="text-sm text-[#74777f] mb-4">No sponsorship applications yet.</p>
                <button onClick={() => setTab('corridors')} className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white" style={{ background: '#002046' }}>Browse Corridors</button>
              </div>
            ) : (
              <div className="space-y-3">
                {apps.map((app) => {
                  const ac = appStatusConfig[app.status];
                  const tc = tierConfig[app.tier];
                  return (
                    <div key={app.id} className="bg-white rounded-xl border border-[#e0e3e5] p-5">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-[#191c1e] text-sm">{app.corridorTitle}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: tc.bg, color: tc.text }}>{tc.label} Sponsor</span>
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: ac.bg, color: ac.text }}>{ac.label}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-[#191c1e]">₦{app.amount.toLocaleString()}</p>
                          <p className="text-xs text-[#74777f]">{new Date(app.createdAt ?? app.appliedAt ?? '').toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Application Detail Modal ───────────────────────────────────────────────

function ApplicationDetailModal({
  app, corridors, onClose, onUpdate, updating,
}: {
  app: SponsorApplication;
  corridors: TradeCorridor[];
  onClose: () => void;
  onUpdate: (status: 'approved' | 'rejected') => void;
  updating: boolean;
}) {
  const ac = appStatusConfig[app.status];
  const tc = tierConfig[app.tier];
  const corridor = corridors.find((c) => c.id === app.corridorId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="border-b border-[#e0e3e5] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-[#191c1e]">Sponsorship Application</h2>
            <p className="text-xs text-[#74777f] mt-0.5">{app.corridorTitle}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#f7f9fb] text-[#74777f]">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <div className="p-6 space-y-5">
          {/* Applicant */}
          <div>
            <p className="text-xs font-semibold text-[#74777f] uppercase tracking-wide mb-2">Applicant</p>
            <div className="rounded-xl border border-[#e0e3e5] divide-y divide-[#f0f2f4]">
              {[
                { label: 'Member Name', value: app.memberName ?? '—' },
                { label: 'Company', value: app.companyName },
                { label: 'Sponsorship Tier', value: <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: tc.bg, color: tc.text }}>{tc.label} Sponsor</span> },
                { label: 'Amount', value: `₦${app.amount.toLocaleString()}` },
                { label: 'Applied', value: new Date(app.createdAt ?? app.appliedAt ?? '').toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' }) },
                { label: 'Status', value: <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: ac.bg, color: ac.text }}>{ac.label}</span> },
              ].map(({ label, value }) => (
                <div key={label} className="grid grid-cols-2 gap-4 px-4 py-2.5">
                  <dt className="text-xs text-[#74777f]">{label}</dt>
                  <dd className="text-xs text-[#191c1e] font-medium">{value}</dd>
                </div>
              ))}
            </div>
          </div>

          {/* Corridor detail */}
          {corridor && (
            <div>
              <p className="text-xs font-semibold text-[#74777f] uppercase tracking-wide mb-2">Corridor</p>
              <div className="rounded-xl border border-[#e0e3e5] p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-[#191c1e]">{corridor.title}</span>
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                    style={{ background: corridorStatusConfig[corridor.status].bg, color: corridorStatusConfig[corridor.status].text }}>
                    {corridorStatusConfig[corridor.status].label}
                  </span>
                </div>
                <p className="text-xs text-[#74777f]">{corridor.origin} → {corridor.destination} · {corridor.category}</p>
                {corridor.tradeVolume && <p className="text-xs text-[#74777f]">Trade volume: <strong>{corridor.tradeVolume}</strong></p>}
                <p className="text-xs text-[#74777f]">{corridor.description}</p>
                {corridor.sponsors.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <p className="text-xs text-[#74777f]">Existing sponsors:</p>
                    {corridor.sponsors.map((s) => (
                      <span key={s.id} className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{ background: tierConfig[s.tier].bg, color: tierConfig[s.tier].text }}>{s.companyName}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          {app.status === 'pending_review' && (
            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <button disabled={updating} onClick={() => onUpdate('rejected')}
                className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#ba1a1a' }}>
                {updating ? 'Saving…' : 'Reject'}
              </button>
              <button disabled={updating} onClick={() => onUpdate('approved')}
                className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#0b6c4b' }}>
                {updating ? 'Saving…' : 'Approve'}
              </button>
            </div>
          )}
          {app.status !== 'pending_review' && (
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Corridor Members Section ───────────────────────────────────────────────

function CorridorMembersSection({ corridorId, isExpanded }: { corridorId: string; isExpanded: boolean }) {
  const [page, setPage] = useState(1);
  const { data: membersData, isLoading } = useGetCorridorMembersQuery(
    { corridorId, page },
    { skip: !isExpanded }
  );

  const items = membersData?.data ?? (isExpanded ? demoCorridorMembers : []);
  const total = membersData?.total ?? (isExpanded ? demoCorridorMembers.length : 0);

  if (!isExpanded) return null;
  if (isLoading) return <div className="pt-2"><SkeletonCard /></div>;

  return (
    <div>
      <p className="text-xs font-semibold text-[#74777f] uppercase tracking-wide mb-3">Members</p>
      {items.length === 0 ? (
        <p className="text-xs text-[#74777f]">No active members in this corridor yet.</p>
      ) : (
        <>
          <div className="rounded-xl border border-[#e0e3e5] overflow-hidden mb-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f7f9fb] border-b border-[#e0e3e5]">
                  {['Name', 'Company', 'Member ID', 'Joined', 'Source'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-[#74777f] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f2f4]">
                {items.map((m) => (
                  <tr key={m.id} className="hover:bg-[#f7f9fb]">
                    <td className="px-4 py-2.5 font-medium text-[#191c1e]">{m.name}</td>
                    <td className="px-4 py-2.5 text-[#74777f]">{m.companyName ?? '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-[#74777f]">{m.memberId}</td>
                    <td className="px-4 py-2.5 text-xs text-[#74777f]">
                      {new Date(m.joinedAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                        style={m.source === 'eco-auto' ? { background: '#a0f4ca', color: '#005137' } : { background: '#e0e3e5', color: '#44474e' }}>
                        {m.source === 'eco-auto' ? 'eCO Auto' : 'Manual'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-xs text-[#74777f]">
            <span>Showing {items.length} of {total} members</span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 rounded-md border border-[#e0e3e5] bg-white disabled:opacity-40 hover:bg-[#f7f9fb]">Previous</button>
              <button disabled={items.length < 20} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-md border border-[#e0e3e5] bg-white disabled:opacity-40 hover:bg-[#f7f9fb]">Next</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Admin View ─────────────────────────────────────────────────────────────

function CreateCorridorModal({ initial, onClose }: { initial?: TradeCorridor; onClose: () => void }) {
  const [createCorridor, { isLoading: creating }] = useCreateCorridorMutation();
  const [updateCorridor, { isLoading: updating }] = useUpdateCorridorMutation();
  const isLoading = creating || updating;
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    origin: initial?.origin ?? '',
    destination: initial?.destination ?? '',
    category: initial?.category ?? '',
    description: initial?.description ?? '',
    status: initial?.status ?? 'upcoming' as const,
    tradeVolume: initial?.tradeVolume ?? '',
    sponsorSlotsAvailable: String(initial?.sponsorSlotsAvailable ?? 3),
    sponsorPriceGold: String(initial?.sponsorPriceGold ?? 0),
    sponsorPriceSilver: String(initial?.sponsorPriceSilver ?? 0),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = {
      ...form,
      sponsorSlotsAvailable: Number(form.sponsorSlotsAvailable),
      sponsorPriceGold: Number(form.sponsorPriceGold),
      sponsorPriceSilver: Number(form.sponsorPriceSilver),
    };
    try {
      if (initial) {
        await updateCorridor({ id: initial.id, ...payload }).unwrap();
      } else {
        await createCorridor(payload).unwrap();
      }
      onClose();
    } catch {
      setError('Failed to save corridor. Please try again.');
    }
  };

  const inputCls = 'w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-[#002046]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#e0e3e5] px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="font-bold text-[#191c1e]">{initial ? 'Edit Corridor' : 'Create New Corridor'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#f7f9fb] text-[#74777f]">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <ErrorBanner message={error} />}

          <div>
            <label className="block text-xs font-semibold text-[#44474e] mb-1">Title *</label>
            <input required value={form.title} onChange={set('title')} placeholder="e.g. Nigeria → China (Leather & Hides)" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#44474e] mb-1">Origin *</label>
              <input required value={form.origin} onChange={set('origin')} placeholder="e.g. Kano, Nigeria" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#44474e] mb-1">Destination *</label>
              <input required value={form.destination} onChange={set('destination')} placeholder="e.g. Guangzhou, China" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#44474e] mb-1">Category *</label>
            <input required value={form.category} onChange={set('category')} placeholder="e.g. Agriculture & Food" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#44474e] mb-1">Description *</label>
            <textarea required rows={3} value={form.description} onChange={set('description')} placeholder="Describe the corridor purpose and opportunities…" className={inputCls + ' resize-none'} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#44474e] mb-1">Status</label>
              <select value={form.status} onChange={set('status')} className={inputCls}>
                <option value="upcoming">Upcoming</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#44474e] mb-1">Trade Volume</label>
              <input value={form.tradeVolume} onChange={set('tradeVolume')} placeholder="e.g. ₦2.3B/year" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#44474e] mb-1">Sponsor Slots</label>
              <input type="number" min={0} value={form.sponsorSlotsAvailable} onChange={set('sponsorSlotsAvailable')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#44474e] mb-1">Gold Price (₦)</label>
              <input type="number" min={0} value={form.sponsorPriceGold} onChange={set('sponsorPriceGold')} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#44474e] mb-1">Silver Price (₦)</label>
              <input type="number" min={0} value={form.sponsorPriceSilver} onChange={set('sponsorPriceSilver')} className={inputCls} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <button type="submit" disabled={isLoading} className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#002046' }}>
              {isLoading ? 'Saving…' : initial ? 'Save Changes' : 'Create Corridor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdminCorridorsView() {
  const { data: corridors, isLoading: corridorsLoading } = useGetAdminCorridorsQuery();
  const { data: applications, isLoading: appsLoading } = useGetAllCorridorApplicationsQuery();
  const [updateApp, { isLoading: updating }] = useUpdateCorridorApplicationMutation();
  const [tab, setTab] = useState<'corridors' | 'applications'>('corridors');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<SponsorApplication | null>(null);

  const [showCreateCorridor, setShowCreateCorridor] = useState(false);
  const [editCorridor, setEditCorridor] = useState<TradeCorridor | null>(null);

  const allCorridors = corridors ?? (corridorsLoading ? demoCorridors : []);
  const allApps = applications ?? (appsLoading ? demoAllApplications : []);
  const pending = allApps.filter((a) => a.status === 'pending_review').length;

  const handleUpdate = async (status: 'approved' | 'rejected') => {
    if (!selectedApp) return;
    await updateApp({ id: selectedApp.id, status });
    setSelectedApp(null);
  };

  return (
    <div className="p-6 max-w-6xl">
      {selectedApp && (
        <ApplicationDetailModal
          app={selectedApp}
          corridors={allCorridors}
          onClose={() => setSelectedApp(null)}
          onUpdate={handleUpdate}
          updating={updating}
        />
      )}

      {(showCreateCorridor || editCorridor) && (
        <CreateCorridorModal
          initial={editCorridor ?? undefined}
          onClose={() => { setShowCreateCorridor(false); setEditCorridor(null); }}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#191c1e]">Trade Corridors Management</h2>
          <p className="text-sm text-[#74777f] mt-0.5">Manage trade corridors and sponsorship applications.</p>
        </div>
        <button
          onClick={() => setShowCreateCorridor(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ background: '#002046' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
          Create Corridor
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { icon: 'route', label: 'Active Corridors', value: allCorridors.filter((c) => c.status === 'active').length, accent: true },
          { icon: 'group', label: 'Total Members', value: allCorridors.reduce((s, c) => s + c.memberCount, 0) },
          { icon: 'pending', label: 'Pending Applications', value: pending },
          { icon: 'workspace_premium', label: 'Total Sponsors', value: allCorridors.reduce((s, c) => s + c.sponsors.length, 0) },
        ].map(({ icon, label, value, accent }) => (
          <div key={label} className={`rounded-xl border p-4 ${accent ? '' : 'bg-white border-[#e0e3e5]'}`} style={accent ? { background: '#002046', borderColor: '#002046' } : {}}>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 18`, color: accent ? '#aec7f7' : '#74777f' }}>{icon}</span>
              <p className={`text-xs font-semibold uppercase tracking-wide ${accent ? 'text-[#aec7f7]' : 'text-[#74777f]'}`}>{label}</p>
            </div>
            <p className={`text-2xl font-bold ${accent ? 'text-white' : 'text-[#191c1e]'}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-[#f7f9fb] rounded-lg p-1 mb-6 w-fit border border-[#e0e3e5]">
        {([['corridors', 'Corridors'], ['applications', `Applications${pending > 0 ? ` (${pending})` : ''}`]] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-[#191c1e] shadow-sm' : 'text-[#74777f] hover:text-[#191c1e]'}`}>{label}</button>
        ))}
      </div>

      {tab === 'corridors' && (
        <div className="space-y-3">
          {corridorsLoading ? <SkeletonCard /> : allCorridors.map((c) => {
            const st = corridorStatusConfig[c.status];
            const isExpanded = expandedId === c.id;
            return (
              <div key={c.id} className="bg-white rounded-xl border border-[#e0e3e5] overflow-hidden">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  className="w-full text-left p-5 flex items-start justify-between hover:bg-[#f7f9fb] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-[#191c1e]">{c.title}</h3>
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: st.bg, color: st.text }}>{st.label}</span>
                    </div>
                    <p className="text-sm text-[#74777f]">{c.origin} → {c.destination} · {c.category}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditCorridor(c); }}
                      className="rounded-lg border border-[#c4c6cf] px-3 py-1.5 text-xs font-semibold text-[#74777f] hover:border-[#002046] hover:text-[#002046] transition-colors"
                    >
                      Edit
                    </button>
                    <div className="text-right">
                      <p className="font-bold text-[#002046]">{c.memberCount} members</p>
                      <p className="text-xs text-[#74777f]">{c.sponsors.length} sponsors · {c.sponsorSlotsAvailable} open slots</p>
                    </div>
                    <span className="material-symbols-outlined text-[#74777f]" style={{ fontSize: 20, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-[#e0e3e5] px-5 py-4 space-y-4 bg-[#fafbfc]">
                    <p className="text-sm text-[#74777f]">{c.description}</p>
                    {c.tradeVolume && (
                      <p className="text-xs text-[#74777f]">Estimated trade volume: <strong className="text-[#191c1e]">{c.tradeVolume}</strong></p>
                    )}

                    {/* Sponsors */}
                    <div>
                      <p className="text-xs font-semibold text-[#74777f] uppercase tracking-wide mb-2">Current Sponsors</p>
                      {c.sponsors.length === 0 ? (
                        <p className="text-xs text-[#74777f]">No sponsors yet.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {c.sponsors.map((s) => (
                            <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                              style={{ background: tierConfig[s.tier].bg, color: tierConfig[s.tier].text }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 12` }}>workspace_premium</span>
                              {s.companyName} · {tierConfig[s.tier].label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Pricing */}
                    <div>
                      <p className="text-xs font-semibold text-[#74777f] uppercase tracking-wide mb-2">Sponsorship Pricing (member-facing)</p>
                      <div className="flex gap-3 flex-wrap">
                        {(['gold', 'silver'] as const).map((t) => {
                          const tc = tierConfig[t];
                          const price = t === 'gold' ? c.sponsorPriceGold : c.sponsorPriceSilver;
                          return (
                            <div key={t} className="rounded-lg border px-4 py-2.5 flex items-center gap-3" style={{ borderColor: tc.accent + '60', background: tc.bg + '40' }}>
                              <span className="text-xs font-semibold" style={{ color: tc.text }}>{tc.label}</span>
                              <span className="font-bold text-sm" style={{ color: tc.text }}>₦{price.toLocaleString()}/yr</span>
                            </div>
                          );
                        })}
                        <div className="rounded-lg border border-[#e0e3e5] bg-white px-4 py-2.5 flex items-center gap-2">
                          <span className="text-xs text-[#74777f]">Open slots:</span>
                          <span className="font-bold text-sm text-[#191c1e]">{c.sponsorSlotsAvailable}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[#e0e3e5] pt-4">
                      <CorridorMembersSection corridorId={c.id} isExpanded={isExpanded} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === 'applications' && (
        <div className="bg-white rounded-xl border border-[#e0e3e5] overflow-hidden">
          {appsLoading ? <div className="p-6"><SkeletonCard /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f7f9fb] border-b border-[#e0e3e5]">
                    {['Applicant', 'Corridor', 'Tier', 'Amount', 'Applied', 'Status', ''].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#74777f] uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f2f4]">
                  {allApps.map((app) => {
                    const ac = appStatusConfig[app.status];
                    const tc = tierConfig[app.tier];
                    return (
                      <tr key={app.id} className="hover:bg-[#f7f9fb] transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-[#191c1e]">{app.memberName ?? '—'}</p>
                          <p className="text-xs text-[#74777f]">{app.companyName}</p>
                        </td>
                        <td className="px-4 py-3 text-[#74777f] max-w-[160px] truncate">{app.corridorTitle}</td>
                        <td className="px-4 py-3"><span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: tc.bg, color: tc.text }}>{tc.label}</span></td>
                        <td className="px-4 py-3 font-semibold text-[#191c1e]">₦{app.amount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-xs text-[#74777f]">{new Date(app.appliedAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td className="px-4 py-3"><span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: ac.bg, color: ac.text }}>{ac.label}</span></td>
                        <td className="px-4 py-3">
                          <button onClick={() => setSelectedApp(app)} className="text-xs font-medium text-[#002046] hover:underline">View</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Router entry ───────────────────────────────────────────────────────────

export function TradeCorrridorsPage() {
  const role = useAppSelector((s) => s.auth.role);
  const isAdmin = role && ADMIN_ROLES.includes(role);
  return isAdmin ? <AdminCorridorsView /> : <MemberCorridorsView />;
}

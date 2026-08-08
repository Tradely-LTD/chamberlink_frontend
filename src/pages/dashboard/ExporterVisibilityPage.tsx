import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { emptyApi } from '@shared/api/emptyApi';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { Button } from '@shared/ui/Button';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { useAppSelector } from '@shared/hooks/useAppDispatch';

// ── Types ─────────────────────────────────────────────────────────────────

interface ExporterProfile {
  id: string;
  memberId: string;
  companyName: string;
  sector: string;
  products: string[];
  description: string;
  certifications: string[];
  tier: 'standard' | 'featured' | 'premium';
  status: 'active' | 'pending_review' | 'suspended' | 'rejected';
  contactEmail: string;
  website?: string;
  viewCount: number;
  inquiryCount: number;
  listedAt: string;
  memberName?: string;
  memberEmail?: string;
  tagline?: string;
  rejectionReason?: string;
}

// Normalize backend shape → frontend shape (handles both flat member shape
// and the nested { profile, memberFirstName, memberLastName } admin shape)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const normalizeProfile = (raw: any): ExporterProfile => {
  // Admin queue returns { profile: {...}, memberFirstName, memberLastName, memberEmail }
  const p = raw.profile ?? raw;
  return {
    id: p.id,
    memberId: p.memberId,
    companyName: p.companyName,
    sector: p.sector,
    products: p.products ? p.products.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
    description: p.description ?? '',
    tagline: p.tagline,
    certifications: p.certifications
      ? (typeof p.certifications === 'string' ? JSON.parse(p.certifications) : p.certifications)
      : [],
    tier: p.tier ?? 'standard',
    status: p.status ?? 'pending_review',
    contactEmail: p.email ?? p.contactEmail ?? '',
    website: p.websiteUrl ?? p.website,
    viewCount: p.profileViews ?? p.viewCount ?? 0,
    inquiryCount: p.inquiryCount ?? 0,
    listedAt: p.createdAt ?? p.listedAt ?? new Date().toISOString(),
    rejectionReason: p.rejectionReason ?? undefined,
    // Member name from admin join fields or flat memberName
    memberName: raw.memberFirstName
      ? `${raw.memberFirstName} ${raw.memberLastName ?? ''}`.trim()
      : (p.memberName ?? undefined),
    memberEmail: raw.memberEmail ?? p.memberEmail ?? undefined,
  };
};

interface ApiResponse<T> { success: boolean; data: T; }
interface PaymentResult { authorizationUrl: string; reference: string; }

// ── API ───────────────────────────────────────────────────────────────────

const exporterApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyExporterProfile: builder.query<ExporterProfile | null, void>({
      query: () => '/exporter-visibility/profile',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transformResponse: (res: any) => res.data ? normalizeProfile(res.data) : null,
      providesTags: ['ExporterProfiles'],
    }),
    getAllExporterProfiles: builder.query<ExporterProfile[], void>({
      query: () => '/exporter-visibility/admin/profiles',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transformResponse: (res: any) => (res.data ?? []).map(normalizeProfile),
      providesTags: ['ExporterProfiles'],
    }),
    createExporterProfile: builder.mutation<ExporterProfile, Partial<ExporterProfile>>({
      query: (body) => ({
        url: '/exporter-visibility/profile',
        method: 'POST',
        body: {
          companyName: body.companyName,
          tagline: body.tagline,
          description: body.description,
          sector: body.sector,
          products: Array.isArray(body.products) ? body.products.join(', ') : body.products,
          certifications: body.certifications,
          websiteUrl: body.website,
          email: body.contactEmail,
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transformResponse: (res: any) => normalizeProfile(res.data),
      invalidatesTags: ['ExporterProfiles'],
    }),
    updateExporterProfile: builder.mutation<void, Partial<ExporterProfile>>({
      query: (body) => ({
        url: '/exporter-visibility/profile',
        method: 'PATCH',
        body: {
          companyName: body.companyName,
          tagline: body.tagline,
          description: body.description,
          sector: body.sector,
          products: Array.isArray(body.products) ? body.products.join(', ') : body.products,
          certifications: body.certifications,
          websiteUrl: body.website,
          email: body.contactEmail,
        },
      }),
      invalidatesTags: ['ExporterProfiles'],
    }),
    upgradeExporterTier: builder.mutation<PaymentResult, { tier: 'featured' | 'premium' }>({
      query: (body) => ({
        url: '/exporter-visibility/upgrade',
        method: 'POST',
        body: { ...body, callbackUrl: `${window.location.origin}/dashboard/exporter-visibility` },
      }),
      transformResponse: (res: ApiResponse<PaymentResult>) => res.data,
    }),
    verifyTierUpgrade: builder.mutation<{ tier: string; confirmed: boolean }, string>({
      query: (reference) => ({ url: '/exporter-visibility/upgrade/verify', params: { reference } }),
      transformResponse: (res: ApiResponse<{ tier: string; confirmed: boolean }>) => res.data,
      invalidatesTags: ['ExporterProfiles'],
    }),
    updateExporterProfileStatus: builder.mutation<void, { id: string; action: 'approve' | 'reject' | 'suspend'; rejectionReason?: string; tier?: string }>({
      query: ({ id, ...body }) => ({ url: `/exporter-visibility/admin/profiles/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['ExporterProfiles'],
    }),
  }),
  overrideExisting: false,
});

const {
  useGetMyExporterProfileQuery,
  useGetAllExporterProfilesQuery,
  useCreateExporterProfileMutation,
  useUpdateExporterProfileMutation,
  useUpgradeExporterTierMutation,
  useVerifyTierUpgradeMutation,
  useUpdateExporterProfileStatusMutation,
} = exporterApi;

// ── Demo data (admin fallback only) ──────────────────────────────────────

const demoAllProfiles: ExporterProfile[] = [
  { id: 'p1', memberId: 'm1', companyName: 'Kano Leather Exports Ltd', sector: 'Leather & Hides', products: ['Finished Leather', 'Wet Blue Hides'], description: 'Leading exporter of premium Nigerian leather products.', certifications: ['NAFDAC', 'NES'], tier: 'featured', status: 'active', contactEmail: 'export@kanoleather.ng', viewCount: 342, inquiryCount: 27, listedAt: '2025-01-15T00:00:00Z', memberName: 'Amina Musa' },
  { id: 'p2', memberId: 'm2', companyName: 'Arewa Groundnut Co.', sector: 'Agriculture', products: ['Groundnuts', 'Sesame'], description: 'Large-scale oilseed exporter from Northern Nigeria.', certifications: ['NAFDAC'], tier: 'premium', status: 'active', contactEmail: 'trade@arewa.ng', viewCount: 891, inquiryCount: 64, listedAt: '2024-11-01T00:00:00Z', memberName: 'Ibrahim Dantata' },
  { id: 'p3', memberId: 'm3', companyName: 'Kano Textiles Export', sector: 'Textiles', products: ['Ankara', 'Adire'], description: 'Exporter of traditional Nigerian textiles.', certifications: ['SON'], tier: 'standard', status: 'pending_review', contactEmail: 'kano@textileexport.ng', viewCount: 112, inquiryCount: 8, listedAt: '2025-03-20T00:00:00Z', memberName: 'Fatima Abubakar' },
];

const tierConfig = {
  standard: { label: 'Standard', bg: '#e0e3e5', text: '#44474e', accent: '#74777f', price: 0 },
  featured:  { label: 'Featured', bg: '#ffdea5', text: '#5d4201', accent: '#c5a059', price: 75000 },
  premium:   { label: 'Premium',  bg: '#d6e3ff', text: '#001b3d', accent: '#002046', price: 150000 },
};

const profileStatusConfig: Record<string, { label: string; bg: string; text: string }> = {
  active:         { label: 'Active',         bg: '#a0f4ca', text: '#005137' },
  pending_review: { label: 'Pending Review', bg: '#ffdea5', text: '#5d4201' },
  suspended:      { label: 'Suspended',      bg: '#ffdad6', text: '#93000a' },
  rejected:       { label: 'Rejected',       bg: '#fce4ec', text: '#880e4f' },
};

const ADMIN_ROLES = ['chamber_admin', 'chamber_executive', 'super_admin', 'staff_operator'];

// ── Profile Form (shared by Create + Edit) ────────────────────────────────

type ProfileFormData = {
  companyName: string; sector: string; products: string;
  description: string; certifications: string; contactEmail: string; website: string; tagline: string;
};

function ProfileFormFields({ form, set }: { form: ProfileFormData; set: (k: keyof ProfileFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void }) {
  return (
    <>
      {([
        { label: 'Company Name',                    key: 'companyName' as const,    placeholder: 'Your exporting entity name', required: true },
        { label: 'Tagline (optional)',               key: 'tagline' as const,        placeholder: 'e.g. Premium leather from Northern Nigeria', required: false },
        { label: 'Sector',                           key: 'sector' as const,         placeholder: 'e.g. Agriculture, Leather, Textiles', required: true },
        { label: 'Products (comma-separated)',       key: 'products' as const,       placeholder: 'e.g. Groundnuts, Sesame, Hides', required: true },
        { label: 'Certifications (comma-separated)', key: 'certifications' as const, placeholder: 'e.g. NAFDAC, SON, NES', required: false },
        { label: 'Contact Email',                    key: 'contactEmail' as const,   placeholder: 'export@yourcompany.ng', required: true },
        { label: 'Website (optional)',               key: 'website' as const,        placeholder: 'https://yourcompany.ng', required: false },
      ] as const).map(({ label, key, placeholder, required }) => (
        <div key={key}>
          <label className="block text-xs font-semibold text-[#44474e] mb-1">{label}</label>
          <input required={required} value={form[key]} onChange={set(key)} placeholder={placeholder}
            className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#002046]" />
        </div>
      ))}
      <div>
        <label className="block text-xs font-semibold text-[#44474e] mb-1">Business Description</label>
        <textarea required rows={3} value={form.description} onChange={set('description')}
          placeholder="Describe your export business…"
          className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#002046] resize-none" />
      </div>
    </>
  );
}

function CreateProfileModal({ onClose }: { onClose: () => void }) {
  const [createProfile, { isLoading }] = useCreateExporterProfileMutation();
  const [error, setError] = useState<string | null>(null);
  const blank = { companyName: '', sector: '', products: '', description: '', certifications: '', contactEmail: '', website: '', tagline: '' };
  const [form, setForm] = useState(blank);
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault(); setError(null);
    try {
      await createProfile({
        ...form,
        products: form.products.split(',').map((p) => p.trim()).filter(Boolean),
        certifications: form.certifications.split(',').map((c) => c.trim()).filter(Boolean),
      }).unwrap();
      onClose();
    } catch { setError('Failed to create profile. Please try again.'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#e0e3e5] px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="font-bold text-[#191c1e]">Create Exporter Profile</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#f7f9fb] text-[#74777f]"><span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <ErrorBanner message={error} />}
          <ProfileFormFields form={form} set={set} />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <button type="submit" disabled={isLoading} className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#002046' }}>
              {isLoading ? 'Creating…' : 'Create Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditProfileModal({ profile, onClose }: { profile: ExporterProfile; onClose: () => void }) {
  const [updateProfile, { isLoading }] = useUpdateExporterProfileMutation();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    companyName: profile.companyName,
    tagline: profile.tagline ?? '',
    sector: profile.sector,
    products: profile.products.join(', '),
    description: profile.description,
    certifications: profile.certifications.join(', '),
    contactEmail: profile.contactEmail,
    website: profile.website ?? '',
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault(); setError(null);
    try {
      await updateProfile({
        ...form,
        products: form.products.split(',').map((p) => p.trim()).filter(Boolean),
        certifications: form.certifications.split(',').map((c) => c.trim()).filter(Boolean),
      }).unwrap();
      onClose();
    } catch { setError('Failed to update profile. Please try again.'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#e0e3e5] px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="font-bold text-[#191c1e]">Edit Exporter Profile</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#f7f9fb] text-[#74777f]"><span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span></button>
        </div>
        {profile.status === 'active' && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-[#ffdea5] bg-[#fffbf0] px-4 py-3 text-xs text-[#5d4201]">
            <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 16, fontVariationSettings: `'FILL' 1` }}>info</span>
            Editing your profile will re-submit it for admin review before it's visible again.
          </div>
        )}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <ErrorBanner message={error} />}
          <ProfileFormFields form={form} set={set} />
          <div className="flex gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <button type="submit" disabled={isLoading} className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#002046' }}>
              {isLoading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Upgrade Modal ─────────────────────────────────────────────────────────

function UpgradeModal({ currentTier, onClose }: { currentTier: ExporterProfile['tier']; onClose: () => void }) {
  const [upgrade, { isLoading }] = useUpgradeExporterTierMutation();
  const [selected, setSelected] = useState<'featured' | 'premium'>(currentTier === 'featured' ? 'premium' : 'featured');
  const [error, setError] = useState<string | null>(null);
  const upgradeable = (['featured', 'premium'] as const).filter((t) => t !== currentTier);

  const handleUpgrade = async () => {
    setError(null);
    try {
      const result = await upgrade({ tier: selected }).unwrap();
      window.location.href = result.authorizationUrl;
    } catch { setError('Upgrade failed. Please try again.'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="border-b border-[#e0e3e5] px-6 py-4 flex items-center justify-between">
          <h2 className="font-bold text-[#191c1e]">Upgrade Visibility Plan</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#f7f9fb] text-[#74777f]"><span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span></button>
        </div>
        <div className="p-6 space-y-4">
          {error && <ErrorBanner message={error} />}
          {upgradeable.map((t) => {
            const tc = tierConfig[t];
            return (
              <button key={t} onClick={() => setSelected(t)} className={`w-full rounded-xl border-2 p-4 text-left transition-all ${selected === t ? '' : 'border-[#e0e3e5]'}`} style={selected === t ? { borderColor: tc.accent, background: tc.bg + '40' } : {}}>
                <div className="flex items-center justify-between mb-1">
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: tc.bg, color: tc.text }}>{tc.label}</span>
                  <span className="font-bold text-[#191c1e]">₦{tc.price.toLocaleString()}/yr</span>
                </div>
                <p className="text-xs text-[#74777f]">{t === 'premium' ? 'Top placement, trade mission recommendations, quarterly newsletter spotlight.' : 'Featured badge, priority placement, up to 10 product images.'}</p>
              </button>
            );
          })}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <button disabled={isLoading} onClick={handleUpgrade} className="flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#002046' }}>
              {isLoading ? 'Processing…' : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>payments</span>Proceed to Payment</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Admin Review Modal ────────────────────────────────────────────────────

function ExporterDetailModal({
  profile,
  onClose,
  onAction,
}: {
  profile: ExporterProfile;
  onClose: () => void;
  onAction: (action: 'approve' | 'reject' | 'suspend', rejectionReason?: string) => void;
}) {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#e0e3e5] px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="font-bold text-[#191c1e]">Business Profile Review</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#f7f9fb] text-[#74777f]">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-lg font-bold text-[#191c1e]">{profile.companyName}</h3>
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold flex-shrink-0" style={{ background: profileStatusConfig[profile.status].bg, color: profileStatusConfig[profile.status].text }}>{profileStatusConfig[profile.status].label}</span>
            </div>
            {profile.tagline && <p className="text-sm text-[#74777f] italic">{profile.tagline}</p>}
            <p className="text-sm text-[#74777f] mt-0.5">{profile.memberName}{profile.memberEmail ? ` · ${profile.memberEmail}` : ''}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="font-semibold text-[#44474e]">Sector: </span><span className="text-[#191c1e]">{profile.sector}</span></div>
            <div><span className="font-semibold text-[#44474e]">Tier: </span><span className="text-[#191c1e] capitalize">{profile.tier}</span></div>
            <div><span className="font-semibold text-[#44474e]">Email: </span><span className="text-[#191c1e]">{profile.contactEmail || '—'}</span></div>
            {profile.website && <div><span className="font-semibold text-[#44474e]">Website: </span><a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-[#002046] underline text-xs">{profile.website}</a></div>}
          </div>

          {profile.description && (
            <div>
              <p className="text-xs font-semibold text-[#44474e] uppercase tracking-wide mb-1">About</p>
              <p className="text-sm text-[#191c1e] leading-relaxed">{profile.description}</p>
            </div>
          )}

          {profile.products.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#44474e] uppercase tracking-wide mb-2">Products & Services</p>
              <div className="flex flex-wrap gap-2">
                {profile.products.map((p, i) => <span key={i} className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium" style={{ background: '#f0f4ff', color: '#001b3d' }}>{p}</span>)}
              </div>
            </div>
          )}

          {profile.certifications.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[#44474e] uppercase tracking-wide mb-2">Certifications</p>
              <div className="flex flex-wrap gap-2">
                {profile.certifications.map((c, i) => <span key={i} className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium" style={{ background: '#e6f5ef', color: '#00502e' }}>{c}</span>)}
              </div>
            </div>
          )}

          {profile.rejectionReason && (
            <div className="rounded-xl border border-[#fce4ec] bg-[#fff5f7] p-3">
              <p className="text-xs font-semibold text-[#880e4f] mb-1">Previous rejection reason</p>
              <p className="text-sm text-[#44474e]">{profile.rejectionReason}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl" style={{ background: '#f7f9fb' }}>
            <div className="text-center"><p className="text-2xl font-bold text-[#191c1e]">{profile.viewCount.toLocaleString()}</p><p className="text-xs text-[#74777f]">Profile Views</p></div>
            <div className="text-center"><p className="text-2xl font-bold text-[#191c1e]">{profile.inquiryCount.toLocaleString()}</p><p className="text-xs text-[#74777f]">Inquiries</p></div>
          </div>

          {/* Reject form inline */}
          {showRejectForm && (
            <div className="rounded-xl border border-[#ffdad6] bg-[#fff5f5] p-4">
              <label className="block text-xs font-semibold text-[#93000a] mb-2">Rejection reason (shown to the member)</label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Incomplete company information — please provide a valid export registration number."
                className="w-full rounded-lg border border-[#ffdad6] px-3 py-2 text-sm focus:outline-none focus:border-[#93000a] resize-none"
              />
              <div className="flex gap-2 mt-2">
                <button onClick={() => setShowRejectForm(false)} className="rounded-lg border border-[#c4c6cf] px-3 py-1.5 text-xs font-semibold text-[#44474e]">Cancel</button>
                <button
                  onClick={() => onAction('reject', rejectReason.trim() || undefined)}
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                  style={{ background: '#93000a' }}
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-[#e0e3e5] px-6 py-4 flex gap-2 flex-wrap">
          <button onClick={onClose} className="rounded-lg border border-[#c4c6cf] px-4 py-2 text-sm font-semibold text-[#191c1e] hover:bg-[#f7f9fb]">Close</button>

          {(profile.status === 'pending_review' || profile.status === 'suspended') && (
            <button onClick={() => onAction('approve')} className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: '#0b6c4b' }}>
              {profile.status === 'suspended' ? 'Reinstate' : 'Approve'}
            </button>
          )}

          {(profile.status === 'pending_review' || profile.status === 'active') && !showRejectForm && (
            <button
              onClick={() => setShowRejectForm(true)}
              className="rounded-lg border border-[#93000a] px-4 py-2 text-sm font-semibold text-[#93000a] hover:bg-[#ffdad6]"
            >
              Reject
            </button>
          )}

          {profile.status === 'active' && (
            <button onClick={() => onAction('suspend')} className="rounded-lg border border-[#c4c6cf] px-4 py-2 text-sm font-semibold text-[#93000a] hover:bg-[#ffdad6]">
              Suspend
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Member View ────────────────────────────────────────────────────────────

function MemberExporterView() {
  const { data: profileData, isLoading, isError, error } = useGetMyExporterProfileQuery();
  const [verifyUpgrade, { isLoading: verifying }] = useVerifyTierUpgradeMutation();

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState<{ confirmed: boolean } | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();
  const callbackRef = searchParams.get('reference') ?? searchParams.get('trxref') ?? null;
  const verifyFired = useRef(false);

  // Payment return: verify the upgrade and clean up the URL
  useEffect(() => {
    if (!callbackRef || verifyFired.current) return;
    verifyFired.current = true;
    verifyUpgrade(callbackRef)
      .unwrap()
      .then((result) => setUpgradeMsg({ confirmed: result.confirmed }))
      .catch(() => setUpgradeMsg({ confirmed: false }))
      .finally(() => setSearchParams({}, { replace: true }));
  }, [callbackRef, verifyUpgrade, setSearchParams]);

  // 404 = member has no profile yet — treat as null, not an error
  const is404 = isError && (error as { status?: number })?.status === 404;
  const profile: ExporterProfile | null = is404 ? null : (profileData ?? null);

  if (isLoading) return <div className="p-6"><SkeletonCard /></div>;

  // Unexpected error (not 404)
  if (isError && !is404) {
    return (
      <div className="p-6 max-w-4xl">
        <ErrorBanner message="Failed to load your exporter profile. Please refresh." />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      {showCreate && <CreateProfileModal onClose={() => setShowCreate(false)} />}
      {showEdit && profile && <EditProfileModal profile={profile} onClose={() => setShowEdit(false)} />}
      {showUpgrade && profile && <UpgradeModal currentTier={profile.tier} onClose={() => setShowUpgrade(false)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#191c1e]">Exporter Visibility Manager</h2>
          <p className="text-sm text-[#74777f] mt-0.5">Manage your public exporter profile and boost visibility to international buyers.</p>
        </div>
      </div>

      {/* Upgrade payment result banner */}
      {(verifying || upgradeMsg) && !verifying && upgradeMsg && (
        <div
          className="mb-4 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm"
          style={upgradeMsg.confirmed
            ? { borderColor: '#a0f4ca', background: '#f0fdf6', color: '#005137' }
            : { borderColor: '#ffdea5', background: '#fffbf0', color: '#5d4201' }}
        >
          <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 18, fontVariationSettings: `'FILL' 1` }}>
            {upgradeMsg.confirmed ? 'check_circle' : 'info'}
          </span>
          {upgradeMsg.confirmed
            ? 'Payment confirmed! Your tier has been upgraded.'
            : 'Payment is being processed. Your tier will update once confirmed.'}
        </div>
      )}
      {verifying && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#d6e3ff] bg-[#f0f4ff] px-4 py-3 text-sm text-[#002046]">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#002046] border-t-transparent flex-shrink-0" />
          Verifying your payment…
        </div>
      )}

      {!profile ? (
        <div className="bg-white rounded-xl border border-[#e0e3e5] p-12 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#d6e3ff' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 32`, color: '#002046' }}>storefront</span>
          </div>
          <h3 className="font-bold text-[#191c1e] mb-2">Get Listed in the Export Directory</h3>
          <p className="text-sm text-[#74777f] mb-6 max-w-sm mx-auto">Create your free exporter profile to reach international buyers through the NACCIMA trade network.</p>
          <button onClick={() => setShowCreate(true)} className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white" style={{ background: '#002046' }}>Create Exporter Profile</button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-[#e0e3e5] p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-[#191c1e]">{profile.companyName}</h3>
                {profile.tagline && <p className="text-sm text-[#74777f] italic mt-0.5">{profile.tagline}</p>}
                <p className="text-sm text-[#74777f] mt-0.5">{profile.sector}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" style={{ background: profileStatusConfig[profile.status].bg, color: profileStatusConfig[profile.status].text }}>{profileStatusConfig[profile.status].label}</span>
                <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" style={{ background: tierConfig[profile.tier].bg, color: tierConfig[profile.tier].text }}>{tierConfig[profile.tier].label}</span>
              </div>
            </div>

            {profile.status === 'rejected' && profile.rejectionReason && (
              <div className="mb-4 rounded-lg border border-[#fce4ec] bg-[#fff5f7] px-4 py-3 text-sm text-[#880e4f]">
                <span className="font-semibold">Rejected: </span>{profile.rejectionReason}
              </div>
            )}

            <p className="text-sm text-[#74777f] mb-4">{profile.description}</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {profile.products.map((p) => <span key={p} className="rounded-full px-2.5 py-0.5 text-xs font-medium border" style={{ background: '#f7f9fb', borderColor: '#e0e3e5', color: '#44474e' }}>{p}</span>)}
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {profile.certifications.map((c) => (
                <span key={c} className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: '#a0f4ca', color: '#005137' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 12` }}>verified</span>{c}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-[#e0e3e5] mb-4">
              {[
                { icon: 'visibility',     label: 'Profile Views',  value: profile.viewCount.toLocaleString() },
                { icon: 'mail',           label: 'Buyer Inquiries', value: profile.inquiryCount.toLocaleString() },
                { icon: 'calendar_today', label: 'Listed',          value: new Date(profile.listedAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' }) },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#74777f]" style={{ fontSize: 20, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20` }}>{icon}</span>
                  <div><p className="text-sm font-bold text-[#191c1e]">{value}</p><p className="text-xs text-[#74777f]">{label}</p></div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowEdit(true)}
              className="flex items-center gap-1.5 rounded-lg border border-[#c4c6cf] px-4 py-2 text-sm font-semibold text-[#44474e] hover:border-[#002046] hover:text-[#002046] transition-colors"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
              Edit Profile
            </button>
          </div>

          {profile.tier !== 'premium' && (
            <div className="bg-white rounded-xl border border-[#e0e3e5] p-6">
              <h3 className="font-semibold text-[#191c1e] mb-1">Boost Your Visibility</h3>
              <p className="text-sm text-[#74777f] mb-4">Upgrade to reach more international buyers and get priority placement in the directory.</p>
              <button onClick={() => setShowUpgrade(true)} className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white" style={{ background: '#002046' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>upgrade</span>Upgrade Plan
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Admin View ─────────────────────────────────────────────────────────────

function AdminExporterView() {
  const { data: profiles, isLoading } = useGetAllExporterProfilesQuery();
  const [updateStatus] = useUpdateExporterProfileStatusMutation();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ExporterProfile['status']>('all');
  const [detailProfile, setDetailProfile] = useState<ExporterProfile | null>(null);

  // Fall back to demo data only when no real data is available (dev/loading)
  const allProfiles = (profiles && profiles.length > 0) ? profiles : (isLoading ? [] : demoAllProfiles);

  const filtered = allProfiles.filter((p) => {
    const matchSearch = p.companyName.toLowerCase().includes(search.toLowerCase()) || p.sector.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleAction = async (action: 'approve' | 'reject' | 'suspend', rejectionReason?: string) => {
    if (!detailProfile) return;
    await updateStatus({ id: detailProfile.id, action, rejectionReason });
    setDetailProfile(null);
  };

  return (
    <div className="p-6 max-w-6xl">
      {detailProfile && (
        <ExporterDetailModal
          profile={detailProfile}
          onClose={() => setDetailProfile(null)}
          onAction={handleAction}
        />
      )}

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#191c1e]">Exporter Visibility Management</h2>
        <p className="text-sm text-[#74777f] mt-0.5">Review and manage member exporter directory listings.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { icon: 'storefront',        label: 'Total Listings',  value: allProfiles.length, accent: true },
          { icon: 'workspace_premium', label: 'Premium',         value: allProfiles.filter((p) => p.tier === 'premium').length },
          { icon: 'star',              label: 'Featured',        value: allProfiles.filter((p) => p.tier === 'featured').length },
          { icon: 'pending',           label: 'Pending Review',  value: allProfiles.filter((p) => p.status === 'pending_review').length },
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

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input type="search" placeholder="Search by company or sector…" value={search} onChange={(e) => setSearch(e.target.value)} className="rounded-lg border border-[#c4c6cf] px-4 py-2 text-sm focus:outline-none focus:border-[#002046] w-64" />
        <div className="flex gap-1 bg-[#f7f9fb] rounded-lg p-1 border border-[#e0e3e5]">
          {(['all', 'active', 'pending_review', 'suspended', 'rejected'] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${statusFilter === s ? 'bg-white shadow-sm text-[#191c1e]' : 'text-[#74777f]'}`}>{s.replace('_', ' ')}</button>
          ))}
        </div>
      </div>

      {isLoading ? <SkeletonCard /> : (
        <div className="bg-white rounded-xl border border-[#e0e3e5] overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center"><p className="text-sm text-[#74777f]">No profiles match the current filter.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f7f9fb] border-b border-[#e0e3e5]">
                    {['Company', 'Member', 'Sector', 'Tier', 'Status', 'Views', 'Inquiries', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#74777f] uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f2f4]">
                  {filtered.map((p) => {
                    const tc = tierConfig[p.tier];
                    const sc = profileStatusConfig[p.status];
                    return (
                      <tr key={p.id} className="hover:bg-[#f7f9fb] transition-colors">
                        <td className="px-4 py-3"><p className="font-semibold text-[#191c1e]">{p.companyName}</p><p className="text-xs text-[#74777f]">{p.contactEmail}</p></td>
                        <td className="px-4 py-3"><p className="text-[#74777f]">{p.memberName ?? '—'}</p>{p.memberEmail && <p className="text-xs text-[#74777f]">{p.memberEmail}</p>}</td>
                        <td className="px-4 py-3 text-[#74777f]">{p.sector}</td>
                        <td className="px-4 py-3"><span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: tc.bg, color: tc.text }}>{tc.label}</span></td>
                        <td className="px-4 py-3"><span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: sc.bg, color: sc.text }}>{sc.label}</span></td>
                        <td className="px-4 py-3 font-medium text-[#191c1e]">{p.viewCount.toLocaleString()}</td>
                        <td className="px-4 py-3 font-medium text-[#191c1e]">{p.inquiryCount.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => setDetailProfile(p)} className="text-xs font-semibold px-3 py-1.5 rounded-md border border-[#002046] text-[#002046] hover:bg-[#002046] hover:text-white transition-colors">
                            Review
                          </button>
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

export function ExporterVisibilityPage() {
  const role = useAppSelector((s) => s.auth.role);
  const isAdmin = role && ADMIN_ROLES.includes(role);
  return isAdmin ? <AdminExporterView /> : <MemberExporterView />;
}

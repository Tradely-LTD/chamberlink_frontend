import { useRef, useState } from 'react';
import { useAppSelector } from '@shared/hooks/useAppDispatch';
import { useGetMemberProfileQuery } from '@features/dashboard/dashboardApi';
import { useGetMembershipStatusQuery } from '@features/membership/membershipApi';
import { useGetMyTenantQuery, useUpdateMyTenantMutation } from '@features/white-label';
import { PageLoader } from '@shared/ui/PageLoader';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { Button } from '@shared/ui/Button';
import { Input } from '@shared/ui/Input';
import { emptyApi } from '@shared/api/emptyApi';

interface ApiResponse<T> { success: boolean; data: T; }

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

const { useUpdateProfileMutation, usePatchProfileMutation, useUploadLogoMutation } = profileApi;

const membershipStatusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  pending_payment: 'bg-yellow-100 text-yellow-800',
  expired: 'bg-red-100 text-red-800',
  suspended: 'bg-gray-100 text-gray-700',
};

const ROLE_LABELS: Record<string, string> = {
  chamber_admin: 'Chamber Admin',
  staff_operator: 'Staff Operator',
  chamber_executive: 'NACCIMA Executive',
  super_admin: 'Super Admin',
  institutional_subscriber: 'Institutional Subscriber',
};

export function ProfilePage() {
  const user = useAppSelector((s) => s.auth.user);
  const role = user?.role;

  // Role flags — computed before any hooks that depend on them
  const isMember = role === 'member';
  const isSuperAdmin = role === 'super_admin';
  const isTenantAdmin = role === 'chamber_admin' || role === 'staff_operator' || role === 'chamber_executive';

  // ALL hooks must be declared unconditionally, before any early returns
  const { data: profile, isLoading, isError, refetch } = useGetMemberProfileQuery();
  const { data: membership } = useGetMembershipStatusQuery();
  const [updateProfile, { isLoading: isSaving }] = useUpdateProfileMutation();
  const [patchProfile, { isLoading: isPatchSaving }] = usePatchProfileMutation();
  const [uploadLogo, { isLoading: isUploadingLogo }] = useUploadLogoMutation();
  const { data: myTenant, refetch: refetchTenant } = useGetMyTenantQuery(undefined, { skip: !isTenantAdmin });
  const [updateMyTenant, { isLoading: isTenantSaving }] = useUpdateMyTenantMutation();

  const [editing, setEditing] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', businessName: '', phone: '' });
  const [bizForm, setBizForm] = useState({ registrationNumber: '', industry: '', address: '', city: '', state: '', website: '' });
  const [saved, setSaved] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [editingOrg, setEditingOrg] = useState(false);
  const [orgForm, setOrgForm] = useState({ address: '', phone: '', email: '', website: '' });
  const [orgError, setOrgError] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setForm({
      firstName: profile?.firstName ?? user?.firstName ?? '',
      lastName: profile?.lastName ?? user?.lastName ?? '',
      businessName: profile?.businessName ?? '',
      phone: '',
    });
    setEditing(true);
    setSaved(false);
  };

  const startBizEdit = () => {
    setBizForm({
      registrationNumber: profile?.registrationNumber ?? '',
      industry: profile?.industry ?? '',
      address: profile?.address ?? '',
      city: profile?.city ?? '',
      state: profile?.state ?? '',
      website: profile?.website ?? '',
    });
    setEditingBusiness(true);
    setSaved(false);
  };

  const handleSave = async () => {
    try {
      await updateProfile(form).unwrap();
      setEditing(false);
      setSaved(true);
      refetch();
    } catch { /* handled by RTK */ }
  };

  const handleBizSave = async () => {
    try {
      const updates: Record<string, string> = {};
      Object.entries(bizForm).forEach(([k, v]) => { if (v.trim()) updates[k] = v.trim(); });
      await patchProfile(updates).unwrap();
      setEditingBusiness(false);
      setSaved(true);
      refetch();
    } catch { /* handled by RTK */ }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setLogoError('Only JPEG and PNG images are allowed.');
      return;
    }
    setLogoError(null);
    const fd = new FormData();
    fd.append('logo', file);
    try {
      await uploadLogo(fd).unwrap();
      refetch();
    } catch (err: unknown) {
      setLogoError((err as { data?: { message?: string } })?.data?.message ?? 'Logo upload failed. Please try again.');
    }
    e.target.value = '';
  };

  const startOrgEdit = () => {
    setOrgForm({
      address: myTenant?.address ?? '',
      phone: myTenant?.phone ?? '',
      email: myTenant?.email ?? '',
      website: myTenant?.website ?? '',
    });
    setEditingOrg(true);
    setOrgError(null);
  };

  const handleOrgSave = async () => {
    setOrgError(null);
    try {
      const updates: Record<string, string> = {};
      Object.entries(orgForm).forEach(([k, v]) => { if (v.trim()) updates[k] = v.trim(); });
      await updateMyTenant(updates).unwrap();
      setEditingOrg(false);
      setSaved(true);
      refetchTenant();
    } catch {
      setOrgError('Failed to update organisation details. Please try again.');
    }
  };

  // Early returns — all hooks are already declared above
  if (isLoading) return <PageLoader />;
  if (isError && isMember) return <div className="p-6"><ErrorBanner message="Failed to load profile." /></div>;

  const logoUrl = profile?.logoUrl;

  // Admin/staff see an organisation-focused profile
  if (!isMember) {
    return (
      <div className="p-6 max-w-2xl">
        <h1 className="text-2xl font-semibold text-[#221a0f] mb-1">My Profile</h1>
        <p className="text-sm text-[#8A7E6E] mb-6">Your account and organisation details.</p>

        {saved && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            Profile updated successfully.
          </div>
        )}

        {/* Platform identity card — super_admin only */}
        {isSuperAdmin ? (
          <div className="bg-white rounded-xl border border-[#bec9bf]/40 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-[#bec9bf]/40">
              <h2 className="font-medium text-[#221a0f]">Platform Identity</h2>
            </div>
            <dl className="divide-y divide-[#bec9bf]/30">
              {[
                { label: 'Platform', value: 'Chamberlink ERP — Chamber Digital Portal' },
                { label: 'Operated by', value: 'Tradely LTD.' },
                { label: 'Your Role', value: ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? '—' },
              ].map((row) => (
                <div key={row.label} className="grid grid-cols-3 gap-4 px-6 py-4">
                  <dt className="text-sm font-medium text-[#8A7E6E]">{row.label}</dt>
                  <dd className="col-span-2 text-sm text-[#221a0f]">{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#bec9bf]/40 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-[#bec9bf]/40 flex items-center justify-between">
              <h2 className="font-medium text-[#221a0f]">Organisation</h2>
              {user?.role === 'chamber_admin' && !editingOrg && (
                <Button variant="outline" onClick={startOrgEdit}>Edit</Button>
              )}
            </div>
            {editingOrg ? (
              <div className="px-6 py-5 space-y-4">
                {orgError && <ErrorBanner message={orgError} />}
                <Input
                  label="Address"
                  placeholder="e.g. 1 Chamber Road, Kano"
                  value={orgForm.address}
                  onChange={(e) => setOrgForm((f) => ({ ...f, address: e.target.value }))}
                />
                <Input
                  label="Phone"
                  placeholder="e.g. +234 700 000 0000"
                  value={orgForm.phone}
                  onChange={(e) => setOrgForm((f) => ({ ...f, phone: e.target.value }))}
                />
                <Input
                  label="Public Email"
                  placeholder="e.g. info@chamber.ng"
                  value={orgForm.email}
                  onChange={(e) => setOrgForm((f) => ({ ...f, email: e.target.value }))}
                />
                <Input
                  label="Website"
                  placeholder="https://chamber.ng"
                  value={orgForm.website}
                  onChange={(e) => setOrgForm((f) => ({ ...f, website: e.target.value }))}
                />
                <div className="flex gap-3 pt-2">
                  <Button loading={isTenantSaving} onClick={handleOrgSave}>Save Changes</Button>
                  <Button variant="outline" onClick={() => setEditingOrg(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <dl className="divide-y divide-[#bec9bf]/30">
                {[
                  { label: 'Organisation', value: myTenant?.name ?? '—' },
                  { label: 'Region', value: myTenant?.region ?? '—' },
                  { label: 'City', value: myTenant?.city ?? '—' },
                  { label: 'Address', value: myTenant?.address ?? '—' },
                  { label: 'Phone', value: myTenant?.phone ?? '—' },
                  { label: 'Public Email', value: myTenant?.email ?? '—' },
                  { label: 'Website', value: myTenant?.website ?? '—' },
                  { label: 'Your Role', value: ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? '—' },
                ].map((row) => (
                  <div key={row.label} className="grid grid-cols-3 gap-4 px-6 py-4">
                    <dt className="text-sm font-medium text-[#8A7E6E]">{row.label}</dt>
                    <dd className="col-span-2 text-sm text-[#221a0f]">{row.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}

        {/* Account card */}
        <div className="bg-white rounded-xl border border-[#bec9bf]/40 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-[#bec9bf]/40 flex items-center justify-between">
            <h2 className="font-medium text-[#221a0f]">Account Details</h2>
            {!editing && <Button variant="outline" onClick={startEdit}>Edit</Button>}
          </div>
          {editing ? (
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input label="First Name" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
                <Input label="Last Name" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
              </div>
              <Input label="Phone Number" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              <div className="flex gap-3 pt-2">
                <Button loading={isSaving} onClick={handleSave}>Save Changes</Button>
                <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <dl className="divide-y divide-[#bec9bf]/30">
              {[
                { label: 'Full Name', value: `${user?.firstName ?? '—'} ${user?.lastName ?? ''}`.trim() },
                { label: 'Email Address', value: user?.email ?? '—' },
              ].map((row) => (
                <div key={row.label} className="grid grid-cols-3 gap-4 px-6 py-4">
                  <dt className="text-sm font-medium text-[#8A7E6E]">{row.label}</dt>
                  <dd className="col-span-2 text-sm text-[#221a0f]">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        {/* Security */}
        <div className="bg-white rounded-xl border border-[#bec9bf]/40 overflow-hidden">
          <div className="px-6 py-4 border-b border-[#bec9bf]/40">
            <h2 className="font-medium text-[#221a0f]">Security</h2>
          </div>
          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#221a0f]">Email Verification</p>
                <p className="text-xs text-[#8A7E6E]">{user?.isEmailVerified ? 'Your email is verified' : 'Email not yet verified'}</p>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${user?.isEmailVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {user?.isEmailVerified ? 'Verified' : 'Pending'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#221a0f]">Multi-Factor Authentication</p>
                <p className="text-xs text-[#8A7E6E]">
                  {user?.isMfaEnabled ? 'MFA is active on this account' : 'MFA is required for admin accounts — please enable it'}
                </p>
              </div>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${user?.isMfaEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-700'}`}>
                {user?.isMfaEnabled ? 'Enabled' : 'Not Enabled'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Member profile view
  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold text-[#221a0f] mb-1">My Profile</h1>
      <p className="text-sm text-[#8A7E6E] mb-6">Manage your personal and business information.</p>

      {saved && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Profile updated successfully.
        </div>
      )}

      {/* Logo card */}
      <div className="mb-6 bg-white rounded-xl border border-[#bec9bf]/40 px-6 py-5 flex items-center gap-5">
        <div className="relative flex-shrink-0">
          {isUploadingLogo ? (
            <div className="w-20 h-20 rounded-xl bg-[#f7f9f7] border border-[#bec9bf]/40 flex items-center justify-center">
              <svg className="w-5 h-5 animate-spin text-[#00502e]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            </div>
          ) : logoUrl ? (
            <img src={logoUrl} alt="Company logo" className="w-20 h-20 rounded-xl object-contain border border-[#bec9bf]/40 bg-white" />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-[#f7f9f7] border-2 border-dashed border-[#bec9bf]/60 flex items-center justify-center text-[#8A7E6E]">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21H5a2 2 0 01-2-2V7l7-4h7a2 2 0 012 2v14a2 2 0 01-2 2z" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#221a0f] mb-0.5">Company Logo</p>
          <p className="text-xs text-[#8A7E6E] mb-3">Used on generated invoices and packing lists. JPEG or PNG · Compressed automatically.</p>
          {logoError && <p className="text-xs text-red-600 mb-2">{logoError}</p>}
          <input ref={logoInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleLogoChange} />
          <button
            onClick={() => logoInputRef.current?.click()}
            disabled={isUploadingLogo}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[#bec9bf]/60 text-[#00502e] hover:bg-[#fdf8f3] transition-colors disabled:opacity-50"
          >
            {logoUrl ? 'Replace Logo' : 'Upload Logo'}
          </button>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white rounded-xl border border-[#bec9bf]/40 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-[#bec9bf]/40 flex items-center justify-between">
          <h2 className="font-medium text-[#221a0f]">Personal Information</h2>
          {!editing && <Button variant="outline" onClick={startEdit}>Edit</Button>}
        </div>

        {editing ? (
          <div className="px-6 py-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="First Name" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
              <Input label="Last Name" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
            </div>
            <Input label="Business Name" value={form.businessName} onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))} />
            <Input label="Phone Number" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            <div className="flex gap-3 pt-2">
              <Button loading={isSaving} onClick={handleSave}>Save Changes</Button>
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <dl className="divide-y divide-[#bec9bf]/30">
            {[
              { label: 'Full Name', value: `${profile?.firstName ?? user?.firstName ?? '—'} ${profile?.lastName ?? user?.lastName ?? ''}`.trim() },
              { label: 'Email Address', value: user?.email ?? '—' },
              { label: 'Business Name', value: profile?.businessName ?? '—' },
              { label: 'Member ID', value: profile?.memberId ?? '—' },
              { label: 'Account Status', value: profile?.status ? profile.status.replace(/_/g, ' ') : '—' },
            ].map((row) => (
              <div key={row.label} className="grid grid-cols-3 gap-4 px-6 py-4">
                <dt className="text-sm font-medium text-[#8A7E6E]">{row.label}</dt>
                <dd className="col-span-2 text-sm text-[#221a0f] capitalize">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* Business Information */}
      <div className="bg-white rounded-xl border border-[#bec9bf]/40 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-[#bec9bf]/40 flex items-center justify-between">
          <h2 className="font-medium text-[#221a0f]">Business Information</h2>
          {!editingBusiness && <Button variant="outline" onClick={startBizEdit}>Edit</Button>}
        </div>

        {editingBusiness ? (
          <div className="px-6 py-5 space-y-4">
            <Input
              label="CAC Registration Number"
              placeholder="e.g. RC-123456"
              value={bizForm.registrationNumber}
              onChange={(e) => setBizForm((f) => ({ ...f, registrationNumber: e.target.value }))}
            />
            <Input
              label="Industry"
              placeholder="e.g. Agriculture, Leather Goods, Textiles"
              value={bizForm.industry}
              onChange={(e) => setBizForm((f) => ({ ...f, industry: e.target.value }))}
            />
            <Input
              label="Business Address"
              placeholder="Street address"
              value={bizForm.address}
              onChange={(e) => setBizForm((f) => ({ ...f, address: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input label="City" placeholder="e.g. Kano" value={bizForm.city} onChange={(e) => setBizForm((f) => ({ ...f, city: e.target.value }))} />
              <Input label="State" placeholder="e.g. Kano State" value={bizForm.state} onChange={(e) => setBizForm((f) => ({ ...f, state: e.target.value }))} />
            </div>
            <Input
              label="Website"
              placeholder="https://yourcompany.com"
              value={bizForm.website}
              onChange={(e) => setBizForm((f) => ({ ...f, website: e.target.value }))}
            />
            <div className="flex gap-3 pt-2">
              <Button loading={isPatchSaving} onClick={handleBizSave}>Save Changes</Button>
              <Button variant="outline" onClick={() => setEditingBusiness(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <dl className="divide-y divide-[#bec9bf]/30">
            {[
              { label: 'CAC Number', value: profile?.registrationNumber ?? '—' },
              { label: 'Industry', value: profile?.industry ?? '—' },
              { label: 'Address', value: [profile?.address, profile?.city, profile?.state].filter(Boolean).join(', ') || '—' },
              { label: 'Website', value: profile?.website ?? '—' },
            ].map((row) => (
              <div key={row.label} className="grid grid-cols-3 gap-4 px-6 py-4">
                <dt className="text-sm font-medium text-[#8A7E6E]">{row.label}</dt>
                <dd className="col-span-2 text-sm text-[#221a0f]">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* Membership Plan */}
      {membership && (
        <div className="bg-white rounded-xl border border-[#bec9bf]/40 overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-[#bec9bf]/40 flex items-center justify-between">
            <h2 className="font-medium text-[#221a0f]">Membership Plan</h2>
            {membership.status && (
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${membershipStatusColors[membership.status] ?? 'bg-gray-100 text-gray-700'}`}>
                {membership.status.replace(/_/g, ' ')}
              </span>
            )}
          </div>
          <dl className="divide-y divide-[#bec9bf]/30">
            {[
              { label: 'Plan', value: membership.tierName ?? '—' },
              {
                label: 'Member Since',
                value: membership.memberSince
                  ? new Date(membership.memberSince).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' })
                  : '—',
              },
              {
                label: 'Expires',
                value: membership.expiresAt
                  ? new Date(membership.expiresAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' })
                  : '—',
              },
            ].map((row) => (
              <div key={row.label} className="grid grid-cols-3 gap-4 px-6 py-4">
                <dt className="text-sm font-medium text-[#8A7E6E]">{row.label}</dt>
                <dd className="col-span-2 text-sm text-[#221a0f] capitalize">{row.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* Security */}
      <div className="bg-white rounded-xl border border-[#bec9bf]/40 overflow-hidden">
        <div className="px-6 py-4 border-b border-[#bec9bf]/40">
          <h2 className="font-medium text-[#221a0f]">Security</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#221a0f]">Email Verification</p>
              <p className="text-xs text-[#8A7E6E]">{user?.isEmailVerified ? 'Your email is verified' : 'Email not yet verified'}</p>
            </div>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${user?.isEmailVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
              {user?.isEmailVerified ? 'Verified' : 'Pending'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[#221a0f]">Multi-Factor Authentication</p>
              <p className="text-xs text-[#8A7E6E]">{user?.isMfaEnabled ? 'MFA is enabled on your account' : 'MFA is not enabled'}</p>
            </div>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${user?.isMfaEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
              {user?.isMfaEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

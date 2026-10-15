import { useRef, useState, type ReactNode } from 'react';
import { useAppDispatch, useAppSelector } from '@shared/hooks/useAppDispatch';
import { useGetMemberProfileQuery } from '@features/dashboard/dashboardApi';
import { useGetMembershipStatusQuery } from '@features/membership/membershipApi';
import { ConnectChamberModal } from '@features/membership/components/ConnectChamberModal';
import { useGetMyTenantQuery, useUpdateMyTenantMutation, useUploadMyTenantLogoMutation } from '@features/white-label';
import {
  useEnableMfaMutation,
  useRequestMfaDisableMutation,
  useDisableMfaMutation,
} from '@features/auth/authApi';
import { updateUser } from '@features/auth/authSlice';
import { PageLoader } from '@shared/ui/PageLoader';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { EmptyState } from '@shared/ui/EmptyState';
import { Button } from '@shared/ui/Button';
import { Input } from '@shared/ui/Input';
import { Toast } from '@shared/ui/Toast';
import { Link } from 'react-router-dom';
import { PageHeader } from '@shared/ui/PageHeader';
import { SectionCard, DetailGrid } from '@shared/ui/SectionCard';
import { StatusBadge, Status } from '@shared/ui/StatusBadge';
import { useUpdateProfileMutation } from '@features/dashboard/profileApi';
import { isNoActiveChamberError } from '@shared/utils';

function errorMessage(err: unknown, fallback: string): string {
  return (err as { data?: { message?: string } })?.data?.message ?? fallback;
}

/** Settings → Security row: lets the signed-in user turn MFA on/off for their own account. */
function MfaSecurityRow() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const [enableMfa, { isLoading: isEnabling }] = useEnableMfaMutation();
  const [requestMfaDisable, { isLoading: isRequesting }] = useRequestMfaDisableMutation();
  const [disableMfa, { isLoading: isConfirming }] = useDisableMfaMutation();
  const [stage, setStage] = useState<'idle' | 'confirm-disable'>('idle');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleEnable = async () => {
    setError('');
    try {
      await enableMfa().unwrap();
      dispatch(updateUser({ isMfaEnabled: true }));
    } catch (err) {
      setError(errorMessage(err, 'Could not enable MFA. Please try again.'));
    }
  };

  const handleRequestDisable = async () => {
    setError('');
    try {
      await requestMfaDisable().unwrap();
      setStage('confirm-disable');
    } catch (err) {
      setError(errorMessage(err, 'Could not send a verification code. Please try again.'));
    }
  };

  const handleConfirmDisable = async () => {
    setError('');
    try {
      await disableMfa({ code }).unwrap();
      dispatch(updateUser({ isMfaEnabled: false }));
      setStage('idle');
      setCode('');
    } catch (err) {
      setError(errorMessage(err, 'Invalid or expired code.'));
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ink">Two-step sign-in</p>
          <p className="text-xs text-ink-subtle">
            {user?.isMfaEnabled
              ? 'A code sent to your email is required each time you sign in.'
              : 'Add a code sent to your email each time you sign in.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge tone={user?.isMfaEnabled ? 'success' : 'neutral'}>{user?.isMfaEnabled ? 'On' : 'Off'}</StatusBadge>
          {stage === 'idle' &&
            (user?.isMfaEnabled ? (
              <Button variant="outline" loading={isRequesting} onClick={handleRequestDisable}>
                Turn off
              </Button>
            ) : (
              <Button variant="outline" loading={isEnabling} onClick={handleEnable}>
                Turn on
              </Button>
            ))}
        </div>
      </div>
      {stage === 'confirm-disable' && (
        <div className="mt-3 flex flex-wrap items-end gap-3 rounded-control border border-border bg-surface-alt px-4 py-3">
          <Input
            label="Enter the code we emailed you"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={6}
          />
          <Button loading={isConfirming} onClick={handleConfirmDisable}>Confirm</Button>
          <Button
            variant="outline"
            onClick={() => {
              setStage('idle');
              setCode('');
              setError('');
            }}
          >
            Cancel
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </div>
  );
}

const ROLE_LABELS: Record<string, string> = {
  member: 'Exporter',
  chamber_admin: 'Chamber admin',
  staff_operator: 'Staff operator',
  chamber_executive: 'Chamber executive',
  super_admin: 'Super admin',
  institutional_subscriber: 'Institution',
};

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' }) : null;

/** Who you are, at a glance: avatar initials, name, email, role. */
function IdentityHeader({ name, email, role, extra }: { name: string; email?: string; role?: string; extra?: ReactNode }) {
  const initials = name.split(' ').map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <section className="mb-6 flex flex-wrap items-center gap-4 rounded-card border border-border bg-surface p-5">
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-primary-soft text-lg font-semibold text-primary">{initials}</div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[17px] font-semibold text-ink">{name}</p>
        <p className="truncate text-[13px] text-ink-subtle">{email}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {role && <StatusBadge tone="info">{ROLE_LABELS[role] ?? role}</StatusBadge>}
        {extra}
      </div>
    </section>
  );
}

function SecurityCard({ verified }: { verified?: boolean }) {
  return (
    <SectionCard title="Security" description="How your account is protected.">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink">Email address</p>
            <p className="text-xs text-ink-subtle">{verified ? 'Confirmed. Sign-in codes and notices go here.' : 'Not confirmed yet. Check your inbox for the link.'}</p>
          </div>
          <StatusBadge tone={verified ? 'success' : 'warning'}>{verified ? 'Confirmed' : 'Not confirmed'}</StatusBadge>
        </div>
        <div className="border-t border-border-subtle pt-5"><MfaSecurityRow /></div>
      </div>
    </SectionCard>
  );
}

export function ProfilePage() {
  const user = useAppSelector((s) => s.auth.user);
  const role = user?.role;
  const isMember = role === 'member';
  const isSuperAdmin = role === 'super_admin';
  const isTenantAdmin = role === 'chamber_admin' || role === 'staff_operator' || role === 'chamber_executive';

  // ALL hooks must be declared unconditionally, before any early returns
  const { data: profile, isLoading, isError, error, refetch } = useGetMemberProfileQuery();
  const { data: membership } = useGetMembershipStatusQuery();
  const [updateProfile, { isLoading: isSaving }] = useUpdateProfileMutation();
  const { data: myTenant, refetch: refetchTenant } = useGetMyTenantQuery(undefined, { skip: !isTenantAdmin });
  const [updateMyTenant, { isLoading: isTenantSaving }] = useUpdateMyTenantMutation();
  const [uploadMyTenantLogo, { isLoading: isUploadingOrgLogo }] = useUploadMyTenantLogoMutation();

  const [editing, setEditing] = useState(false);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [formError, setFormError] = useState<string | null>(null);
  const [editingOrg, setEditingOrg] = useState(false);
  const [orgForm, setOrgForm] = useState({ address: '', phone: '', email: '', website: '' });
  const [orgError, setOrgError] = useState<string | null>(null);
  const orgLogoInputRef = useRef<HTMLInputElement>(null);

  const fullName = `${profile?.firstName ?? user?.firstName ?? ''} ${profile?.lastName ?? user?.lastName ?? ''}`.trim() || (user?.email ?? 'Your account');

  const startEdit = () => {
    setForm({ firstName: profile?.firstName ?? user?.firstName ?? '', lastName: profile?.lastName ?? user?.lastName ?? '', phone: '' });
    setFormError(null);
    setEditing(true);
  };
  const handleSave = async () => {
    setFormError(null);
    try {
      await updateProfile({ firstName: form.firstName, lastName: form.lastName, ...(form.phone ? { phone: form.phone } : {}) }).unwrap();
      setEditing(false);
      setToast({ message: 'Your details were saved.', type: 'success' });
      refetch();
    } catch (err) {
      setFormError(errorMessage(err, 'Could not save your details.'));
    }
  };

  const handleOrgLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) { setOrgError('Use a JPEG or PNG image.'); return; }
    const fd = new FormData();
    fd.append('logo', file);
    try { await uploadMyTenantLogo(fd).unwrap(); refetchTenant(); }
    catch (err) { setOrgError(errorMessage(err, 'Logo upload failed. Please try again.')); }
  };
  const startOrgEdit = () => {
    setOrgForm({ address: myTenant?.address ?? '', phone: myTenant?.phone ?? '', email: myTenant?.email ?? '', website: myTenant?.website ?? '' });
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
      setToast({ message: 'Chamber details were saved.', type: 'success' });
      refetchTenant();
    } catch {
      setOrgError('Could not save the chamber details. Please try again.');
    }
  };

  const frame = 'mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8';
  const column = 'max-w-3xl space-y-6';
  const toastEl = toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />;

  if (isLoading) return <PageLoader />;

  // Member with no chamber yet: identity is global, so it still shows.
  if (isError && isMember) {
    if (isNoActiveChamberError(error)) {
      return (
        <div className={frame}>
          <PageHeader title="My profile" description="Your personal account. Company details live under My Company." />
          <div className={column}>
            <IdentityHeader name={fullName} email={user?.email} role={role} />
            <EmptyState
              icon="corporate_fare"
              title="Not connected to a chamber yet"
              message="Connect to a chamber to edit your personal details, see your membership and get the member rate on certificates."
              action={<Button onClick={() => setConnectModalOpen(true)}>Connect a chamber</Button>}
            />
            <SecurityCard verified={user?.isEmailVerified} />
          </div>
          {connectModalOpen && (
            <ConnectChamberModal onClose={() => setConnectModalOpen(false)} onConnected={(message) => setToast({ message, type: 'success' })} />
          )}
          {toastEl}
        </div>
      );
    }
    return <div className={frame}><ErrorBanner message="Couldn't load your profile." onRetry={refetch} /></div>;
  }

  const personal = (
    <SectionCard
      title="Personal details"
      action={!editing && <Button size="sm" variant="secondary" onClick={startEdit}>Edit</Button>}
      footer={editing && <>
        <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
        <Button loading={isSaving} onClick={handleSave}>Save changes</Button>
      </>}
    >
      {formError && <div className="mb-4"><ErrorBanner message={formError} /></div>}
      {editing ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="First name" autoComplete="given-name" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} />
          <Input label="Last name" autoComplete="family-name" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
          <div className="sm:col-span-2">
            <Input label="Phone number" type="tel" autoComplete="tel" hint="Leave blank to keep the current number." value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          </div>
        </div>
      ) : (
        <DetailGrid items={[
          { label: 'First name', value: profile?.firstName ?? user?.firstName },
          { label: 'Last name', value: profile?.lastName ?? user?.lastName },
          { label: 'Email', value: user?.email },
          { label: 'Role', value: ROLE_LABELS[role ?? ''] ?? role },
        ]} />
      )}
    </SectionCard>
  );

  // Staff, chamber admins, executives, super admin
  if (!isMember) {
    return (
      <div className={frame}>
        <PageHeader title="My profile" description={isSuperAdmin ? 'Your account on the platform.' : 'Your account and your chamber’s public details.'} />
        <div className={column}>
          <IdentityHeader name={fullName} email={user?.email} role={role} />
          {personal}

          {isSuperAdmin ? (
            <SectionCard title="Platform">
              <DetailGrid items={[
                { label: 'Product', value: 'Chamberlink' },
                { label: 'Operated by', value: 'Tradely LTD' },
              ]} />
            </SectionCard>
          ) : (
            <SectionCard
              title="Chamber"
              description="Shown on your chamber's public listing and Chamber Network cards."
              action={role === 'chamber_admin' && !editingOrg && <Button size="sm" variant="secondary" onClick={startOrgEdit}>Edit</Button>}
              footer={editingOrg && <>
                <Button variant="secondary" onClick={() => setEditingOrg(false)}>Cancel</Button>
                <Button loading={isTenantSaving} onClick={handleOrgSave}>Save changes</Button>
              </>}
            >
              {orgError && <div className="mb-4"><ErrorBanner message={orgError} /></div>}
              <div className="mb-6 flex items-center gap-4">
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-card border border-border bg-surface-alt">
                  {myTenant?.logoUrl
                    ? <img src={myTenant.logoUrl} alt="Chamber logo" className="h-full w-full object-contain" />
                    : <span className="material-symbols-outlined text-ink-subtle" aria-hidden="true" style={{ fontSize: 26 }}>corporate_fare</span>}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">{myTenant?.name ?? 'Chamber'}</p>
                  <p className="text-xs text-ink-subtle">{[myTenant?.city, myTenant?.region].filter(Boolean).join(', ') || 'Location not set'}</p>
                  {role === 'chamber_admin' && (
                    <>
                      <input ref={orgLogoInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleOrgLogoChange} />
                      <Button size="sm" variant="secondary" className="mt-2" loading={isUploadingOrgLogo} onClick={() => orgLogoInputRef.current?.click()}>
                        {myTenant?.logoUrl ? 'Replace logo' : 'Upload logo'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {editingOrg ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2"><Input label="Address" placeholder="e.g. 1 Chamber Road, Kano" value={orgForm.address} onChange={(e) => setOrgForm((f) => ({ ...f, address: e.target.value }))} /></div>
                  <Input label="Phone" type="tel" placeholder="e.g. +234 700 000 0000" value={orgForm.phone} onChange={(e) => setOrgForm((f) => ({ ...f, phone: e.target.value }))} />
                  <Input label="Public email" type="email" placeholder="e.g. info@chamber.ng" value={orgForm.email} onChange={(e) => setOrgForm((f) => ({ ...f, email: e.target.value }))} />
                  <div className="sm:col-span-2"><Input label="Website" placeholder="https://chamber.ng" value={orgForm.website} onChange={(e) => setOrgForm((f) => ({ ...f, website: e.target.value }))} /></div>
                </div>
              ) : (
                <DetailGrid items={[
                  { label: 'Address', value: myTenant?.address, wide: true },
                  { label: 'Phone', value: myTenant?.phone },
                  { label: 'Public email', value: myTenant?.email },
                  { label: 'Website', value: myTenant?.website, wide: true },
                ]} />
              )}
            </SectionCard>
          )}

          <SecurityCard verified={user?.isEmailVerified} />
        </div>
        {toastEl}
      </div>
    );
  }

  // Exporter / member
  return (
    <div className={frame}>
      <PageHeader title="My profile" description="Your personal account. Company details live under My Company." />
      <div className={column}>
        <IdentityHeader
          name={fullName}
          email={user?.email}
          role={role}
          extra={profile?.memberId && <span className="font-mono text-xs text-ink-subtle">{profile.memberId}</span>}
        />

        {personal}

        <SectionCard
          title="Chamber membership"
          description={membership?.tierName ? `${membership.tierName.replace(/^\w/, (c) => c.toUpperCase())} plan` : undefined}
          action={membership?.status && <Status status={membership.status} />}
          footer={<>
            <Link to="/dashboard/connections" className="text-[13px] font-medium text-primary hover:underline underline-offset-2">My chambers</Link>
            <Link to="/dashboard/membership" className="inline-flex h-8 items-center rounded-control border border-border-strong bg-surface px-3 text-[13px] font-medium text-ink shadow-card hover:bg-surface-alt">Manage membership</Link>
          </>}
        >
          <DetailGrid items={[
            { label: 'Member ID', value: profile?.memberId && <span className="font-mono text-[13px]">{profile.memberId}</span> },
            { label: 'Plan', value: membership?.tierName && <span className="capitalize">{membership.tierName}</span> },
            { label: 'Member since', value: fmtDate(membership?.memberSince) },
            { label: 'Renews on', value: fmtDate(membership?.expiresAt) },
          ]} />
        </SectionCard>

        <Link to="/dashboard/company" className="group flex items-center gap-4 rounded-card border border-border bg-surface p-5 transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-card-hover focus-visible:shadow-focus">
          <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-control bg-primary-soft text-primary">
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 20 }}>domain</span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-ink">Company and business details</span>
            <span className="block text-[13px] text-ink-subtle">Your TIN, trading name, CAC number, address and document logo are under My Company.</span>
          </span>
          <span className="material-symbols-outlined text-ink-subtle transition-transform group-hover:translate-x-0.5" aria-hidden="true" style={{ fontSize: 20 }}>chevron_right</span>
        </Link>

        <SecurityCard verified={user?.isEmailVerified} />
      </div>
      {toastEl}
    </div>
  );
}

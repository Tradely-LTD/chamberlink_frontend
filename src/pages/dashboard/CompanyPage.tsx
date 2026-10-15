import { useState } from 'react';
import {
  useGetMyCompanyQuery,
  useRegisterCompanyMutation,
  useAddCompanySubUserMutation,
  useRemoveCompanySubUserMutation,
  type ExporterCompany,
  type MyCompanyResponse,
  type TinVerificationStatus,
} from '@features/companies/companiesApi';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { PageHeader } from '@shared/ui/PageHeader';
import { SectionCard, DetailGrid } from '@shared/ui/SectionCard';
import { StatusBadge, type StatusTone } from '@shared/ui/StatusBadge';
import { BusinessProfileCard } from '@features/dashboard/components/BusinessProfileCard';
import { Button } from '@shared/ui/Button';
import { Input } from '@shared/ui/Input';

const STATUS_TONE: Record<TinVerificationStatus, StatusTone> = {
  verified: 'success',
  pending_review: 'warning',
  failed: 'danger',
};

const STATUS_LABEL: Record<TinVerificationStatus, string> = {
  verified: 'Verified',
  pending_review: 'Awaiting verification',
  failed: 'Verification failed',
};

const apiMessage = (err: unknown, fallback: string): string =>
  (err as { data?: { message?: string } })?.data?.message ?? fallback;

/**
 * What a verified company buys the applicant, stated plainly. Worth saying
 * explicitly because "awaiting verification" otherwise reads as a pointless
 * delay rather than the thing that makes their certificates carry a confirmed
 * exporter name (RFP §6.2).
 */
function StatusNotice({ company }: { company: ExporterCompany }) {
  if (company.verificationStatus === 'verified') {
    return (
      <div className="rounded-control border border-success-border bg-success-bg px-4 py-3 text-[13px] text-success">
        <strong>Verified.</strong> Your registered company name and address are now applied automatically
        to every certificate application you submit, so you no longer type them in.
      </div>
    );
  }
  if (company.verificationStatus === 'failed') {
    return (
      <div className="rounded-control border border-danger-border bg-danger-bg px-4 py-3 text-[13px] text-danger">
        <strong>We couldn&apos;t verify this company.</strong>
        {company.verificationNotes && <div className="mt-1">{company.verificationNotes}</div>}
        <div className="mt-1">
          Contact NACCIMA to correct your details. You can still apply for certificates in the meantime,
          entering your company details on the application itself.
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-control border border-warning-border bg-warning-bg px-4 py-3 text-[13px] text-warning">
      <strong>Awaiting verification.</strong> NACCIMA is confirming your TIN against tax records. This
      doesn&apos;t block you. You can apply for certificates now, entering your company details on the
      application. Once verified, they&apos;ll be filled in for you.
    </div>
  );
}

function RegisterCompanyForm() {
  const [register, { isLoading }] = useRegisterCompanyMutation();
  const [form, setForm] = useState({ tin: '', submittedName: '', submittedAddress: '', contactEmail: '', contactPhone: '' });
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  // Mirrors the server's format gate so an obvious typo is caught before a round trip.
  const tinDigits = form.tin.replace(/[\s-]/g, '');
  const tinLooksValid = /^\d{10,14}$/.test(tinDigits);
  const canSubmit = tinLooksValid && form.submittedName.trim().length >= 2;

  const handleSubmit = async () => {
    setError(null);
    try {
      await register({
        tin: form.tin.trim(),
        submittedName: form.submittedName.trim(),
        submittedAddress: form.submittedAddress.trim() || undefined,
        contactEmail: form.contactEmail.trim() || undefined,
        contactPhone: form.contactPhone.trim() || undefined,
      }).unwrap();
    } catch (err) {
      setError(apiMessage(err, 'Could not register your company. Please try again.'));
    }
  };

  return (
    <div className="bg-surface rounded-card border border-border p-6">
      <h2 className="text-[17px] font-semibold text-ink">Register your exporting company</h2>
      <p className="mt-1 mb-5 text-sm text-ink-subtle">
        Your company is identified by its Tax Identification Number. Once NACCIMA has confirmed it
        against tax records, your registered name and address are applied to every certificate
        application automatically, so you won&apos;t type them in again.
      </p>

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      <div className="flex flex-col gap-4">
        <Input
          label="Tax Identification Number (TIN) *"
          placeholder="e.g. 1234567890"
          value={form.tin}
          onChange={(e) => set('tin', e.target.value)}
          error={form.tin && !tinLooksValid ? 'A TIN is 10 to 14 digits.' : undefined}
        />
        <Input
          label="Registered company name *"
          placeholder="Exactly as it appears on your tax records"
          value={form.submittedName}
          onChange={(e) => set('submittedName', e.target.value)}
        />
        <Input
          label="Registered address"
          placeholder="Optional"
          value={form.submittedAddress}
          onChange={(e) => set('submittedAddress', e.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Company email"
            type="email"
            placeholder="Optional"
            value={form.contactEmail}
            onChange={(e) => set('contactEmail', e.target.value)}
          />
          <Input
            label="Company phone"
            placeholder="Optional"
            value={form.contactPhone}
            onChange={(e) => set('contactPhone', e.target.value)}
          />
        </div>
      </div>

      <Button
        loading={isLoading}
        disabled={!canSubmit}
        onClick={handleSubmit}
        className="mt-5 bg-primary hover:bg-primary-hover text-white"
      >
        Register company
      </Button>
    </div>
  );
}

// Typed against MyCompanyResponse directly, NOT derived from the query hook's
// return type. Deriving it made this component's inference depend on the whole
// injected-endpoint graph, and it silently collapsed to `any` (so `m` below lost
// its type) as soon as another injectEndpoints call was added elsewhere.
function SubUsers({ data }: { data: MyCompanyResponse & { company: ExporterCompany } }) {
  const [addSubUser, { isLoading: adding }] = useAddCompanySubUserMutation();
  const [removeSubUser, { isLoading: removing }] = useRemoveCompanySubUserMutation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isOwner = data.role === 'owner';
  const subUsers = data.members.filter((m) => m.role === 'sub_user');
  const atLimit = subUsers.length >= data.maxSubUsers;

  const handleAdd = async () => {
    setError(null);
    try {
      await addSubUser({ email: email.trim() }).unwrap();
      setEmail('');
    } catch (err) {
      setError(apiMessage(err, 'Could not add that person. Please try again.'));
    }
  };

  const handleRemove = async (userId: string) => {
    setError(null);
    try {
      await removeSubUser(userId).unwrap();
    } catch (err) {
      setError(apiMessage(err, 'Could not remove that person. Please try again.'));
    }
  };

  return (
    <div className="bg-surface rounded-card border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-[15px] font-semibold text-ink">Who can apply for this company</h2>
        <p className="mt-0.5 text-[13px] text-ink-subtle">
          {isOwner
            ? `You can authorise up to ${data.maxSubUsers} colleague${data.maxSubUsers === 1 ? '' : 's'} to apply for certificates on the company's behalf. ${subUsers.length} of ${data.maxSubUsers} used.`
            : 'Only the company administrator can change who is authorised here.'}
        </p>
      </div>

      <div className="divide-y divide-border-subtle">
        {data.members.map((m) => (
          <div key={m.userId} className="flex items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-ink truncate">{m.firstName} {m.lastName}</div>
              <div className="text-xs text-ink-subtle truncate">{m.email}</div>
            </div>
            <StatusBadge tone={m.role === 'owner' ? 'info' : 'neutral'}>
              {m.role === 'owner' ? 'Administrator' : 'Can apply'}
            </StatusBadge>
            {isOwner && m.role === 'sub_user' && (
              <Button size="sm" variant="danger" loading={removing} onClick={() => handleRemove(m.userId)}>
                Remove
              </Button>
            )}
          </div>
        ))}
      </div>

      {isOwner && (
        <div className="border-t border-border bg-surface-alt px-5 py-4 rounded-b-card">
          {error && <div className="mb-3"><ErrorBanner message={error} /></div>}
          {atLimit ? (
            <p className="text-xs text-ink-subtle">
              You&apos;ve used all {data.maxSubUsers} sub-user places. Remove someone to add another.
            </p>
          ) : (
            <>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Input
                    label="Add a colleague by email"
                    type="email"
                    placeholder="They need a Chamberlink account already"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button
                  loading={adding}
                  disabled={!/^\S+@\S+\.\S+$/.test(email.trim())}
                  onClick={handleAdd}
                  className="bg-primary hover:bg-primary-hover text-white"
                >
                  Add
                </Button>
              </div>
              <p className="mt-2 text-xs text-ink-subtle">
                They must have registered on Chamberlink first. Ask them to create an account, then add
                them here.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Verified exporter company identity and its sub-users (RFP §3.2, §4.1.4, §6.2).
 * Having no company is a normal state, not an error — this page then leads with
 * registration rather than an empty shell.
 */
export function CompanyPage() {
  const { data, isLoading, isError, refetch } = useGetMyCompanyQuery();

  if (isLoading) return <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8 [&>*]:max-w-3xl"><SkeletonCard /></div>;
  if (isError || !data) {
    return (
      <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8 [&>*]:max-w-3xl">
        <ErrorBanner message="Couldn't load your company details." onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader
        title="My company"
        description="Your exporting company: its verified tax identity, business details, and who may apply on its behalf."
      />

      <div className="max-w-3xl space-y-6">
        {!data.company ? (
          <RegisterCompanyForm />
        ) : (
          <>
            <StatusNotice company={data.company} />
            <SectionCard
              title={data.company.name}
              description={<>TIN <span className="font-mono">{data.company.tin}</span></>}
              action={<StatusBadge tone={STATUS_TONE[data.company.verificationStatus]}>{STATUS_LABEL[data.company.verificationStatus]}</StatusBadge>}
            >
              {/* Both are shown once verified so the applicant can see what the
                  tax record says versus what they entered. */}
              <DetailGrid items={[
                ...(data.company.registeredName ? [{ label: 'Registered name (tax records)', value: data.company.registeredName }] : []),
                { label: 'Name you submitted', value: data.company.submittedName },
                { label: 'Address printed on certificates', value: data.company.registeredAddress ?? data.company.submittedAddress, wide: true },
              ]} />
            </SectionCard>
          </>
        )}

        <BusinessProfileCard />

        {/* Inside the `data.company` branch, so the narrowed shape holds. */}
        {data.company && <SubUsers data={{ ...data, company: data.company }} />}
      </div>
    </div>
  );
}

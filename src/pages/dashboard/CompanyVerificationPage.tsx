import { useState } from 'react';
import {
  useGetCompanyQueueQuery,
  useReviewCompanyMutation,
  type ExporterCompany,
  type TinVerificationStatus,
} from '@features/companies/companiesApi';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { EmptyState } from '@shared/ui/EmptyState';
import { Badge } from '@shared/ui/Badge';
import { Button } from '@shared/ui/Button';
import { Input } from '@shared/ui/Input';
import { Textarea } from '@shared/ui/Textarea';

const FILTERS: { label: string; value: TinVerificationStatus }[] = [
  { label: 'Awaiting Verification', value: 'pending_review' },
  { label: 'Verified', value: 'verified' },
  { label: 'Failed', value: 'failed' },
];

const apiMessage = (err: unknown, fallback: string): string =>
  (err as { data?: { message?: string } })?.data?.message ?? fallback;

/**
 * One company's verification decision (RFP §4.1.3).
 *
 * The administrator transcribes the name and address AS THEY APPEAR ON THE TAX
 * RECORD — those values, not the applicant's, get stamped onto every certificate
 * the company applies for, which is the whole point of §6.2. The submitted values
 * are prefilled only as a starting point for that transcription, and shown
 * alongside so a discrepancy is visible rather than accidentally rubber-stamped.
 */
function ReviewCard({ company }: { company: ExporterCompany }) {
  const [review, { isLoading }] = useReviewCompanyMutation();
  const [open, setOpen] = useState(false);
  const [registeredName, setRegisteredName] = useState(company.submittedName);
  const [registeredAddress, setRegisteredAddress] = useState(company.submittedAddress ?? '');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (decision: 'verify' | 'fail') => {
    setError(null);
    try {
      await review({
        companyId: company.id,
        decision,
        ...(decision === 'verify'
          ? { registeredName: registeredName.trim(), registeredAddress: registeredAddress.trim() || undefined }
          : { notes: notes.trim() }),
      }).unwrap();
      setOpen(false);
    } catch (err) {
      setError(apiMessage(err, 'Could not save the decision. Please try again.'));
    }
  };

  const isPending = company.verificationStatus === 'pending_review';

  return (
    <div className="bg-surface rounded-card border border-border overflow-hidden">
      <div className="flex items-start justify-between gap-4 px-6 py-4">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-ink truncate">{company.submittedName}</h3>
          <p className="text-xs text-ink-subtle mt-0.5">
            TIN <span className="font-mono">{company.tin}</span>
            {company.submittedAddress && <> · {company.submittedAddress}</>}
          </p>
          {company.registeredName && company.registeredName !== company.submittedName && (
            <p className="text-xs text-ink-subtle mt-0.5">
              Registered as <strong className="text-ink">{company.registeredName}</strong>
            </p>
          )}
          {company.verificationNotes && (
            <p className="text-xs text-ink-subtle mt-0.5">{company.verificationNotes}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge
            variant={
              company.verificationStatus === 'verified'
                ? 'success'
                : company.verificationStatus === 'failed'
                  ? 'error'
                  : 'warning'
            }
          >
            {FILTERS.find((f) => f.value === company.verificationStatus)?.label ?? company.verificationStatus}
          </Badge>
          {isPending && !open && (
            <Button variant="outline" onClick={() => setOpen(true)}>Review</Button>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-border px-6 py-4">
          {error && <div className="mb-3"><ErrorBanner message={error} /></div>}
          <p className="text-xs text-ink-subtle mb-3">
            Check this TIN against tax records, then enter the company&apos;s details exactly as the record
            shows them. These become the exporter name and address printed on its certificates.
          </p>
          <div className="flex flex-col gap-3">
            <Input
              label="Registered name (as on the tax record)"
              value={registeredName}
              onChange={(e) => setRegisteredName(e.target.value)}
            />
            <Input
              label="Registered address"
              placeholder="Optional"
              value={registeredAddress}
              onChange={(e) => setRegisteredAddress(e.target.value)}
            />
            <Textarea
              label="Notes"
              placeholder="Required if you cannot verify. The applicant sees this"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              loading={isLoading}
              disabled={registeredName.trim().length < 2}
              onClick={() => submit('verify')}
              className="bg-primary hover:bg-primary-hover text-white"
            >
              Verify Company
            </Button>
            <Button
              variant="outline"
              loading={isLoading}
              disabled={notes.trim().length < 3}
              onClick={() => submit('fail')}
              className="border-danger-border text-danger hover:bg-danger-bg"
            >
              Cannot Verify
            </Button>
            <Button variant="outline" onClick={() => { setOpen(false); setError(null); }}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Administrator queue for confirming exporter companies against tax records
 * (RFP §4.1.3, §6.2).
 *
 * This queue exists because no Nigeria Revenue Service API is integrated — the
 * TIN provider defaults to manual review. If an automated provider is configured
 * later, companies verify at registration and this queue simply runs empty,
 * still handling the cases the provider could not answer.
 */
export function CompanyVerificationPage() {
  const [status, setStatus] = useState<TinVerificationStatus>('pending_review');
  const { data: companies, isLoading, isError, refetch } = useGetCompanyQueueQuery(status);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8 [&>*]:max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Company Verification</h1>
        <p className="text-sm text-ink-subtle mt-0.5">
          Confirm each exporter company&apos;s TIN against tax records. A verified company&apos;s
          registered name and address are applied automatically to its certificate applications.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              status === f.value
                ? 'bg-primary text-white'
                : 'bg-surface border border-border text-ink-subtle hover:text-ink'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && <SkeletonCard />}
      {isError && (
        <>
          <ErrorBanner message="Failed to load the company queue." />
          <Button variant="outline" onClick={() => refetch()} className="mt-4">Try again</Button>
        </>
      )}
      {!isLoading && !isError && companies?.length === 0 && (
        <EmptyState
          icon="domain"
          title={status === 'pending_review' ? 'Nothing awaiting verification' : 'Nothing here'}
          message={
            status === 'pending_review'
              ? 'Every registered company has been reviewed.'
              : 'No companies with this status yet.'
          }
        />
      )}
      {!isLoading && !isError && !!companies?.length && (
        <div className="flex flex-col gap-3">
          {companies.map((c) => <ReviewCard key={c.id} company={c} />)}
        </div>
      )}
    </div>
  );
}

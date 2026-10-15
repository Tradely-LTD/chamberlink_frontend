import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '@shared/hooks/useAppDispatch';
import {
  useGetEcoCertificatesQuery,
  useGetAdminEcoQueueQuery,
  useReviewEcoCertMutation,
  useLazyGetEcoCertDownloadUrlQuery,
  useInitiateEcoPaymentMutation,
  type ECertStatus,
  type EcoQueueItem,
} from '@features/eco/ecoApi';
import { useGetCertificateTypesQuery } from '@features/eco/ecoApi';
import { useGetMyConnectionsQuery } from '@features/membership';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { Button } from '@shared/ui/Button';
import { PageHeader } from '@shared/ui/PageHeader';
import { StatusBadge, type StatusTone } from '@shared/ui/StatusBadge';
import { TableCard } from '@shared/ui/TableCard';
import { EmptyState } from '@shared/ui/EmptyState';
import { SegmentedTabs } from '@shared/ui/SegmentedTabs';
import { Modal } from '@shared/ui/Modal';
import { Textarea } from '@shared/ui/Textarea';

// ── Shared status config ───────────────────────────────────────────────────

const statusTone: Record<ECertStatus, StatusTone> = {
  draft: 'neutral', submitted: 'info', under_review: 'warning', revision_requested: 'warning',
  approved: 'gold', pending_payment: 'gold', issued: 'success', rejected: 'danger', revoked: 'danger',
};
const CertStatus = ({ status }: { status: ECertStatus }) => <StatusBadge tone={statusTone[status]}>{statusLabel[status]}</StatusBadge>;

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' });

const linkBtn = 'inline-flex h-8 items-center gap-1.5 rounded-control border border-border-strong bg-surface px-3 text-[13px] font-medium text-ink shadow-card transition-colors hover:bg-surface-alt focus-visible:shadow-focus';

const statusLabel: Record<ECertStatus, string> = {
  draft: 'Draft', submitted: 'Submitted', under_review: 'Under review',
  pending_payment: 'Awaiting payment', approved: 'Approved', issued: 'Issued',
  rejected: 'Rejected', revision_requested: 'Changes requested', revoked: 'Revoked',
};

const ADMIN_ROLES = ['super_admin', 'chamber_admin', 'staff_operator', 'chamber_executive'];
const READ_ONLY_ROLES = ['chamber_executive']; // can view queue but not take action

// ── Admin queue status filter options ────────────────────────────────────

const FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Under review', value: 'under_review' },
  { label: 'Approved', value: 'approved' },
  { label: 'Awaiting payment', value: 'pending_payment' },
  { label: 'Issued', value: 'issued' },
  { label: 'Rejected', value: 'rejected' },
  // Revoked certificates need their own filter, not to be folded into Rejected:
  // an administrator auditing withdrawals is asking a different question from
  // one reviewing refusals (RFP §4.1.12, §6.7).
  { label: 'Revoked', value: 'revoked' },
];

// ── Review Notes Modal ────────────────────────────────────────────────────

type ReviewAction = 'start_review' | 'approve' | 'reject' | 'request_revision';

function ReviewNotesModal({
  item, action, onClose, onConfirm, isLoading,
}: {
  item: EcoQueueItem;
  action: ReviewAction;
  onClose: () => void;
  onConfirm: (notes: string) => void;
  isLoading: boolean;
}) {
  const [notes, setNotes] = useState('');
  const requiresNotes = action === 'reject' || action === 'request_revision';

  const title = action === 'start_review' ? 'Start review' : action === 'request_revision' ? 'Request changes' : action === 'approve' ? 'Approve application' : 'Reject application';
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          variant={action === 'reject' ? 'danger' : 'primary'}
          loading={isLoading}
          disabled={requiresNotes && !notes.trim()}
          onClick={() => onConfirm(notes)}
        >
          {action === 'approve' ? 'Approve' : action === 'reject' ? 'Reject application' : action === 'request_revision' ? 'Send request' : 'Confirm'}
        </Button>
      </>}
    >
      <p className="mb-4 text-[13px] text-ink-muted">
        {item.applicantFirstName} {item.applicantLastName} · {item.solidMineralName ?? '–'} to {item.destinationCountry ?? '–'}
      </p>
      <Textarea
        label={requiresNotes ? 'Reason for the applicant *' : 'Note for the applicant (optional)'}
        rows={4}
        placeholder={action === 'approve' ? 'Optional remarks for the applicant…' : 'What needs to change, or why it was refused…'}
        hint={requiresNotes ? 'The applicant sees this exactly as written.' : undefined}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
    </Modal>
  );
}

// ── Signed URL helper — shared by member and admin views ──────────────────

function CertActionButtons({ certId, compact = false }: { certId: string; compact?: boolean }) {
  const [fetchUrl] = useLazyGetEcoCertDownloadUrlQuery();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = async (mode: 'view' | 'download') => {
    setBusy(true);
    setError(null);
    try {
      const result = await fetchUrl(certId).unwrap();
      if (mode === 'download') {
        const a = document.createElement('a');
        a.href = result.url;
        a.download = `eCO-${certId}.pdf`;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else {
        window.open(result.url, '_blank', 'noopener,noreferrer');
      }
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message ?? 'Failed to open certificate';
      setError(msg);
    } finally { setBusy(false); }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {error && <span className="material-symbols-outlined text-danger" title={error} aria-label={error} style={{ fontSize: 16 }}>error</span>}
        <Button size="sm" disabled={busy} onClick={() => open('download')}>
          <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 16 }}>download</span>
          {busy ? 'Opening…' : 'Download'}
        </Button>
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => open('view')}>View</Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-danger">{error}</span>}
      <Button size="sm" variant="secondary" disabled={busy} onClick={() => open('view')}>View</Button>
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => open('download')}>Download</Button>
    </div>
  );
}

// Keep the old name as an alias so the admin queue below doesn't need changes
const CertDownloadButtons = ({ certId }: { certId: string }) =>
  <CertActionButtons certId={certId} />;

// ── "Mark Membership Verified" button (admin, under_review + self-declared member) ──

function VerifyMembershipButton({ item, onDone }: { item: EcoQueueItem; onDone: () => void }) {
  const [reviewEco, { isLoading }] = useReviewEcoCertMutation();
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setError(null);
    try {
      await reviewEco({ id: item.id, action: 'verify_membership', verified: true }).unwrap();
      onDone();
    } catch {
      setError('Failed to verify membership.');
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Button size="sm" variant="secondary" loading={isLoading} onClick={handleVerify}>
        <span className="material-symbols-outlined text-success" aria-hidden="true" style={{ fontSize: 16 }}>verified</span>
        Verify membership
      </Button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}

// ── Admin Queue View ──────────────────────────────────────────────────────

function AdminEcoQueue({ isReadOnly }: { isReadOnly: boolean }) {
  const [statusFilter, setStatusFilter] = useState('');
  const [reviewModal, setReviewModal] = useState<{
    item: EcoQueueItem;
    action: ReviewAction;
  } | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useGetAdminEcoQueueQuery(
    { status: statusFilter || undefined },
    { refetchOnMountOrArgChange: true }
  );
  const [reviewEco, { isLoading: reviewing }] = useReviewEcoCertMutation();
  const [startingReviewId, setStartingReviewId] = useState<string | null>(null);

  const items = data ?? [];

  const handleAction = async (item: EcoQueueItem, action: ReviewAction) => {
    setReviewError(null);
    // start_review is just an internal "move to under_review" transition — no
    // reason/instructions is meaningful here, so skip the notes modal and fire
    // it immediately (matches request_revision/reject, which DO need a reason
    // because that text is shown to the applicant).
    if (action === 'start_review') {
      setStartingReviewId(item.id);
      try {
        await reviewEco({ id: item.id, action: 'start_review' }).unwrap();
        refetch();
      } catch {
        setReviewError('Action failed. Please try again.');
      } finally {
        setStartingReviewId(null);
      }
      return;
    }
    setReviewModal({ item, action });
  };

  const handleConfirm = async (notes: string) => {
    if (!reviewModal) return;
    try {
      await reviewEco({ id: reviewModal.item.id, action: reviewModal.action, notes: notes || undefined }).unwrap();
      setReviewModal(null);
      refetch();
    } catch {
      setReviewError('Action failed. Please try again.');
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8">
      {reviewModal && (
        <ReviewNotesModal
          item={reviewModal.item}
          action={reviewModal.action}
          onClose={() => setReviewModal(null)}
          onConfirm={handleConfirm}
          isLoading={reviewing}
        />
      )}

      <PageHeader
        eyebrow="Review"
        title="Certificate queue"
        description={isReadOnly ? 'Every certificate application for your chamber (read-only).' : 'Review, approve or reject certificate applications. Approved applications are issued once paid.'}
        actions={!isLoading ? <span className="num text-[13px] text-ink-subtle"><span className="font-semibold text-ink">{items.length}</span> {items.length === 1 ? 'application' : 'applications'}</span> : undefined}
      />

      {reviewError && <div className="mb-4"><ErrorBanner message={reviewError} /></div>}

      <SegmentedTabs className="mb-5" label="Filter by status" tabs={FILTER_OPTIONS} value={statusFilter} onChange={setStatusFilter} />

      {isLoading && (
        <div className="space-y-2">{[1, 2, 3, 4].map((i) => <SkeletonCard key={i} className="h-14 min-h-0" />)}</div>
      )}
      {isError && <ErrorBanner message="Couldn't load the certificate queue." onRetry={refetch} />}

      {!isLoading && !isError && items.length === 0 && (
        <EmptyState icon="task_alt" title="Nothing here" message="No applications match this filter." />
      )}

      {!isLoading && !isError && items.length > 0 && (
        <TableCard>
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Applicant</th><th scope="col">Goods</th><th scope="col">Destination</th>
                  <th scope="col">Status</th><th scope="col">Submitted</th><th scope="col" className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <p className="font-medium text-ink whitespace-nowrap">{item.applicantFirstName} {item.applicantLastName}</p>
                      {item.memberId && <p className="font-mono text-[11.5px] text-ink-subtle whitespace-nowrap">{item.memberId}</p>}
                    </td>
                    <td><p className="max-w-[220px] truncate" title={item.solidMineralName ?? undefined}>{item.solidMineralName ?? '–'}</p></td>
                    <td className="whitespace-nowrap">{item.destinationCountry ?? '–'}</td>
                    <td><CertStatus status={item.status} /></td>
                    <td className="num whitespace-nowrap text-ink-subtle">{fmtDate(item.createdAt)}</td>
                    <td>
                      <div className="flex flex-nowrap items-center justify-end gap-2">
                        {/* submitted — admin can start review or wait for payment */}
                        {item.status === 'submitted' && !isReadOnly && (
                          <Button size="sm" loading={startingReviewId === item.id} onClick={() => handleAction(item, 'start_review')}>
                            Start review
                          </Button>
                        )}
                        {item.status === 'submitted' && isReadOnly && (
                          <span className="text-xs text-ink-subtle">Awaiting review</span>
                        )}
                        {(item.status === 'pending_payment' || item.status === 'approved') && (
                          <span className="text-xs text-ink-subtle whitespace-nowrap">Awaiting payment</span>
                        )}

                        {/* Mark Membership Verified — under_review + self-declared member only */}
                        {!isReadOnly && item.status === 'under_review' && item.selfDeclaredIsMember && (
                          <VerifyMembershipButton item={item} onDone={refetch} />
                        )}

                        {/* Review actions — only for non-read-only admins on actionable statuses.
                            Note: reject / request_revision are also valid from 'approved' so a
                            reviewer can walk back a mistaken approval before the applicant pays. */}
                        {!isReadOnly && ['under_review', 'revision_requested'].includes(item.status) && (
                          <Button size="sm" onClick={() => handleAction(item, 'approve')}>Approve</Button>
                        )}
                        {!isReadOnly && ['under_review', 'approved'].includes(item.status) && (
                          <>
                            <Button size="sm" variant="secondary" onClick={() => handleAction(item, 'request_revision')}>Request changes</Button>
                            <Button size="sm" variant="danger" onClick={() => handleAction(item, 'reject')}>Reject</Button>
                          </>
                        )}

                        {/* Certificate actions once issued */}
                        {item.certificatePdfUrl && (
                          <CertDownloadButtons certId={item.id} />
                        )}

                        {/* View detail — always visible */}
                        <Link to={`/dashboard/eco/${item.id}`} className="text-[13px] font-medium text-primary hover:underline underline-offset-2 whitespace-nowrap">
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        </TableCard>
      )}
    </div>
  );
}

// ── Pay Application Fee button ────────────────────────────────────────────

function PayButton({ certId }: { certId: string }) {
  const [initiatePayment, { isLoading }] = useInitiateEcoPaymentMutation();
  const [error, setError] = useState<string | null>(null);

  const handlePay = async () => {
    setError(null);
    try {
      const result = await initiatePayment({
        certificateId: certId,
        callbackUrl: `${window.location.origin}/dashboard/eco`,
      }).unwrap();
      window.location.href = result.authorizationUrl;
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message ?? 'Could not initiate payment. Please try again.';
      setError(msg);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Button size="sm" loading={isLoading} onClick={handlePay}>
        {!isLoading && <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 16 }}>payments</span>}
        {isLoading ? 'Redirecting…' : 'Pay fee'}
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

// ── Verify Payment button (for pending_payment certs after returning from Paystack) ──
// Uses plain fetch — NOT the RTK Query client — so the reauth interceptor
// can never trigger a hard logout on this public endpoint.

function VerifyPaymentButton({ certRef, onConfirmed }: { certRef: string; onConfirmed: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'done' | 'failed' | 'not_confirmed'>('idle');

  const handleVerify = async () => {
    setIsLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL as string;
      const res = await fetch(`${baseUrl}/eco/payment/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: certRef }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { message?: string }).message ?? 'Verification failed');
      }
      setStatus('done');
      onConfirmed();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      setStatus(msg.toLowerCase().includes('not confirmed') ? 'not_confirmed' : 'failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'done') {
    return <p className="text-xs font-semibold text-primary">Payment confirmed. The certificate is being issued.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      <Button size="sm" variant="secondary" loading={isLoading} onClick={handleVerify}>
        {isLoading ? 'Checking…' : 'I’ve paid, check payment'}
      </Button>
      {status === 'failed' && (
        <p className="text-xs text-danger">Could not confirm the payment. Please try again.</p>
      )}
      {status === 'not_confirmed' && (
        <p className="text-xs text-gold">
          Paystack hasn&apos;t confirmed the payment yet. Wait a moment then try again.
        </p>
      )}
    </div>
  );
}

// ── Member Certificate List ───────────────────────────────────────────────

function MemberEcoView() {
  const { data: certs, isLoading, isError, isFetching, refetch } = useGetEcoCertificatesQuery();

  // A member's certificate history spans every chamber they've ever applied
  // through (getMyCertificates is scoped by userId, not by chamber) — so
  // switching the active chamber needs a filter here, not a server refetch,
  // to show "certs from the chamber I'm currently in" without losing the rest.
  const activeTenantId = useAppSelector((s) => s.auth.user?.activeTenantId);
  const { data: connections } = useGetMyConnectionsQuery();
  const tenantNameById = useMemo(
    () => new Map((connections ?? []).map((c) => [c.tenantId, c.tenantName])),
    [connections]
  );
  const [chamberFilter, setChamberFilter] = useState<'active' | 'all'>('active');
  const canFilterByChamber = !!activeTenantId;
  const displayedCerts = chamberFilter === 'active' && activeTenantId
    ? (certs ?? []).filter((c) => c.tenantId === activeTenantId)
    : (certs ?? []);

  // hasCachedData: a previous successful load exists — show stale data rather than a hard error
  const hasCachedData = Array.isArray(certs);

  const { data: certificateTypes } = useGetCertificateTypesQuery();
  const typeName = (code: string) => certificateTypes?.find((t) => t.code === code)?.name ?? 'Certificate of Origin';

  // One line telling the applicant what happens next — never just a status word.
  const nextStep = (status: ECertStatus, hasPaymentRef: boolean): string | null => {
    switch (status) {
      case 'draft': return 'Not submitted yet';
      case 'submitted': return 'Waiting for the chamber to start review';
      case 'under_review': return 'The chamber is reviewing it';
      case 'revision_requested': return 'Changes requested: edit and resubmit';
      case 'approved': return 'Approved: pay the fee to issue';
      case 'pending_payment': return hasPaymentRef ? 'Payment started: confirm it below' : 'Pay the fee to continue';
      case 'issued': return 'Ready to download';
      default: return null;
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader
        title="Certificate applications"
        description="Drafts, reviews, payments and issued certificates, in one place."
        actions={
          <Link to="/dashboard/eco/apply" className="inline-flex h-10 items-center gap-2 rounded-control bg-primary px-4 text-sm font-medium text-white shadow-card transition-colors hover:bg-primary-hover focus-visible:shadow-focus">
            <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>add</span>
            New application
          </Link>
        }
      />

      {canFilterByChamber && (
        <SegmentedTabs
          className="mb-5"
          label="Filter by chamber"
          value={chamberFilter}
          onChange={setChamberFilter}
          tabs={[
            { value: 'active', label: tenantNameById.get(activeTenantId!) ?? 'Current chamber' },
            { value: 'all', label: 'All chambers', count: (certs ?? []).length },
          ]}
        />
      )}

      {isLoading && <div className="space-y-2">{[1, 2, 3, 4].map((i) => <SkeletonCard key={i} className="h-14 min-h-0" />)}</div>}

      {/* Hard error: only when there is no cached data to show */}
      {isError && !hasCachedData && <ErrorBanner message="Couldn't load your applications." onRetry={() => refetch()} />}

      {/* Soft error: when a background refetch fails but cached data is still visible */}
      {isError && hasCachedData && (
        <div className="mb-4 flex items-center gap-2 rounded-control border border-warning-border bg-warning-bg px-3 py-2 text-[13px] text-warning">
          <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 16 }}>sync_problem</span>
          Could not refresh. Showing the last loaded data.
          <button onClick={() => refetch()} disabled={isFetching} className="ml-auto font-medium underline-offset-2 hover:underline disabled:opacity-50">
            {isFetching ? 'Refreshing…' : 'Retry'}
          </button>
        </div>
      )}

      {!isLoading && !isError && displayedCerts.length === 0 && (certs ?? []).length === 0 && (
        <EmptyState
          icon="description"
          title="No applications yet"
          message="Choose a certificate and fill in the application. You can save a draft and finish later."
          action={<Link to="/dashboard/eco/apply" className="inline-flex h-10 items-center rounded-control bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover">Start an application</Link>}
        />
      )}

      {/* Filtered-to-empty: certs exist, just none for the selected chamber */}
      {!isLoading && !isError && displayedCerts.length === 0 && (certs ?? []).length > 0 && (
        <EmptyState
          icon="filter_alt"
          title="None for this chamber"
          message="You have applications with other chambers."
          action={<Button variant="secondary" onClick={() => setChamberFilter('all')}>Show all chambers</Button>}
        />
      )}

      {!isLoading && displayedCerts.length > 0 && (
        <TableCard>
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Reference</th>
                <th scope="col" className="hidden md:table-cell">Destination</th>
                <th scope="col">Status</th>
                <th scope="col" className="hidden sm:table-cell text-right">Fee</th>
                <th scope="col" className="hidden lg:table-cell">Submitted</th>
                <th scope="col" className="text-right"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {displayedCerts.map((cert) => {
                const isEditableDraft = cert.status === 'draft' || cert.status === 'revision_requested';
                const isPayable = cert.status === 'approved' || (cert.status === 'pending_payment' && !cert.paymentRef);
                const isPendingPaymentWithRef = cert.status === 'pending_payment' && !!cert.paymentRef;
                const isIssued = cert.status === 'issued';
                const hint = nextStep(cert.status, !!cert.paymentRef);
                return (
                  <tr key={cert.id} className={isPayable ? 'bg-gold-soft/40' : ''}>
                    <td>
                      <Link to={`/dashboard/eco/${cert.id}`} className="font-mono text-[12.5px] font-medium text-ink hover:text-primary">
                        {cert.certificateNumber ?? <span className="font-sans text-[13px] text-ink-subtle">Not yet numbered</span>}
                      </Link>
                      <p className="text-xs text-ink-subtle">
                        {typeName(cert.certificateTypeCode)}
                        {cert.solidMineralName ? ` · ${cert.solidMineralName}` : ''}
                        {chamberFilter === 'all' && cert.tenantId ? ` · ${tenantNameById.get(cert.tenantId) ?? ''}` : ''}
                      </p>
                    </td>
                    <td className="hidden md:table-cell whitespace-nowrap">{cert.destinationCountry || '–'}</td>
                    <td>
                      <CertStatus status={cert.status} />
                      {hint && <p className="mt-1 text-xs text-ink-subtle sm:whitespace-nowrap">{hint}</p>}
                    </td>
                    <td className="hidden sm:table-cell num whitespace-nowrap text-right">
                      {cert.applicationFee != null && cert.applicationFee > 0 ? `₦${cert.applicationFee.toLocaleString('en-NG', { maximumFractionDigits: 2 })}` : '–'}
                    </td>
                    <td className="hidden lg:table-cell num whitespace-nowrap text-ink-subtle">{fmtDate(cert.createdAt)}</td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        {isPayable && <PayButton certId={cert.id} />}
                        {isPendingPaymentWithRef && <VerifyPaymentButton certRef={cert.paymentRef!} onConfirmed={refetch} />}
                        {isEditableDraft && (
                          <Link to={`/dashboard/eco/apply/${cert.id}`} className={linkBtn}>
                            {cert.status === 'draft' ? 'Continue' : 'Edit and resubmit'}
                          </Link>
                        )}
                        {isIssued && <CertActionButtons certId={cert.id} compact />}
                        <Link to={`/dashboard/eco/${cert.id}`} className="text-[13px] font-medium text-primary hover:underline underline-offset-2 whitespace-nowrap">
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableCard>
      )}
    </div>
  );
}

// ── Entry point ───────────────────────────────────────────────────────────

export function EcoPage() {
  const role = useAppSelector((s) => s.auth.role);
  const isAdmin = role && ADMIN_ROLES.includes(role);
  const isReadOnly = role ? READ_ONLY_ROLES.includes(role) : false;

  return isAdmin
    ? <AdminEcoQueue isReadOnly={isReadOnly} />
    : <MemberEcoView />;
}

import { useState } from 'react';
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
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { Button } from '@shared/ui/Button';
import { Badge } from '@shared/ui/Badge';

// ── Shared status config ───────────────────────────────────────────────────

const statusVariant: Record<ECertStatus, 'success' | 'warning' | 'error' | 'default'> = {
  issued: 'success', approved: 'success',
  submitted: 'warning', under_review: 'warning', pending_payment: 'warning',
  draft: 'default',
  rejected: 'error', revision_requested: 'error',
};

const statusLabel: Record<ECertStatus, string> = {
  draft: 'Draft', submitted: 'Submitted', under_review: 'Under Review',
  pending_payment: 'Pending Payment', approved: 'Approved', issued: 'Issued',
  rejected: 'Rejected', revision_requested: 'Revision Required',
};

const ADMIN_ROLES = ['super_admin', 'chamber_admin', 'staff_operator', 'chamber_executive'];
const READ_ONLY_ROLES = ['chamber_executive']; // can view queue but not take action

// ── Admin queue status filter options ────────────────────────────────────

const FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Submitted', value: 'submitted' },
  { label: 'Under Review', value: 'under_review' },
  { label: 'Pending Payment', value: 'pending_payment' },
  { label: 'Approved', value: 'approved' },
  { label: 'Issued', value: 'issued' },
  { label: 'Rejected', value: 'rejected' },
];

// ── Review Notes Modal ────────────────────────────────────────────────────

function ReviewNotesModal({
  item, action, onClose, onConfirm, isLoading,
}: {
  item: EcoQueueItem;
  action: 'start_review' | 'approve' | 'reject' | 'request_revision';
  onClose: () => void;
  onConfirm: (notes: string) => void;
  isLoading: boolean;
}) {
  const [notes, setNotes] = useState('');
  const requiresNotes = action === 'reject' || action === 'request_revision';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="border-b border-[#bec9bf]/40 px-6 py-4 flex items-center justify-between">
          <h3 className="font-semibold text-[#221a0f] capitalize">
            {action === 'start_review' ? 'Start Review' : action === 'request_revision' ? 'Request Revision' : action === 'approve' ? 'Approve Application' : 'Reject Application'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#fdf8f3] text-[#8A7E6E]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm text-[#8A7E6E] mb-4">
            Application by <span className="font-medium text-[#221a0f]">{item.companyName}</span> — {item.solidMineralName} → {item.destinationCountry}
          </p>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-[#44474e] mb-1">
              {requiresNotes ? 'Notes (required)' : 'Notes (optional)'}
            </label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-[#bec9bf]/60 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#023293]/30 resize-none"
              placeholder={action === 'approve' ? 'Optional remarks for the applicant…' : 'Reason or instructions for the applicant…'}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              loading={isLoading}
              disabled={requiresNotes && !notes.trim()}
              className={action === 'approve' ? 'bg-[#023293] hover:bg-[#0267bf] text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
              onClick={() => onConfirm(notes)}
            >
              Confirm
            </Button>
          </div>
        </div>
      </div>
    </div>
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
        {error && <span className="text-xs text-red-600" title={error}>⚠</span>}
        <button disabled={busy} onClick={() => open('view')}
          className="flex items-center gap-1 rounded-lg border border-[#bec9bf]/60 px-2.5 py-1.5 text-xs font-semibold text-[#023293] hover:bg-[#f0faf4] transition-colors disabled:opacity-50">
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>visibility</span>
          {busy ? '…' : 'View'}
        </button>
        <button disabled={busy} onClick={() => open('download')}
          className="flex items-center gap-1 rounded-lg border border-[#bec9bf]/60 px-2.5 py-1.5 text-xs font-semibold text-[#8A7E6E] hover:bg-[#f7f9f7] transition-colors disabled:opacity-50">
          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>download</span>
          {busy ? '…' : 'Download'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-600" title={error}>⚠ {error}</span>}
      <button disabled={busy} onClick={() => open('view')}
        className="text-xs font-medium text-[#023293] hover:underline disabled:opacity-50">
        {busy ? '…' : 'View'}
      </button>
      <button disabled={busy} onClick={() => open('download')}
        className="text-xs font-medium text-[#8A7E6E] hover:underline disabled:opacity-50">
        {busy ? '…' : 'Download'}
      </button>
    </div>
  );
}

// Keep the old name as an alias so the admin queue below doesn't need changes
const CertDownloadButtons = ({ certId }: { certId: string }) =>
  <CertActionButtons certId={certId} />;

// ── Admin Queue View ──────────────────────────────────────────────────────

function AdminEcoQueue({ isReadOnly }: { isReadOnly: boolean }) {
  const [statusFilter, setStatusFilter] = useState('');
  const [reviewModal, setReviewModal] = useState<{
    item: EcoQueueItem;
    action: 'start_review' | 'approve' | 'reject' | 'request_revision';
  } | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useGetAdminEcoQueueQuery(
    { status: statusFilter || undefined },
    { refetchOnMountOrArgChange: true }
  );
  const [reviewEco, { isLoading: reviewing }] = useReviewEcoCertMutation();

  const items = data ?? [];

  const handleAction = (item: EcoQueueItem, action: 'start_review' | 'approve' | 'reject' | 'request_revision') => {
    setReviewError(null);
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
    <div className="p-6 max-w-6xl">
      {reviewModal && (
        <ReviewNotesModal
          item={reviewModal.item}
          action={reviewModal.action}
          onClose={() => setReviewModal(null)}
          onConfirm={handleConfirm}
          isLoading={reviewing}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#221a0f]">eCO Review Queue</h1>
          <p className="text-sm text-[#8A7E6E] mt-0.5">
            {isReadOnly ? 'View all eCO applications.' : 'Review, approve, or reject Certificate of Origin applications.'}
          </p>
        </div>
        {!isLoading && (
          <div className="flex items-center gap-2 text-sm text-[#8A7E6E]">
            <span className="font-medium text-[#221a0f]">{items.length}</span> applications
          </div>
        )}
      </div>

      {reviewError && <div className="mb-4"><ErrorBanner message={reviewError} /></div>}

      {/* Status filter tabs */}
      <div className="flex gap-1 bg-[#fdf8f3] rounded-lg p-1 mb-6 w-fit border border-[#bec9bf]/40 overflow-x-auto">
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
              statusFilter === opt.value
                ? 'bg-white text-[#221a0f] shadow-sm'
                : 'text-[#8A7E6E] hover:text-[#221a0f]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-[#bec9bf]/40 p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-[#e8ece8] rounded w-1/4" />
                  <div className="h-3 bg-[#e8ece8] rounded w-1/3" />
                </div>
                <div className="h-6 bg-[#e8ece8] rounded-full w-20" />
                <div className="h-4 bg-[#e8ece8] rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      )}
      {isError && <ErrorBanner message="Failed to load eCO queue." />}

      {!isLoading && !isError && items.length === 0 && (
        <div className="bg-white rounded-xl border border-[#bec9bf]/40 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[#023293]/10 flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-[#023293]" style={{ fontSize: 32, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 32` }}>task_alt</span>
          </div>
          <h3 className="text-base font-medium text-[#221a0f] mb-1">Queue is empty</h3>
          <p className="text-sm text-[#8A7E6E]">No applications match the selected filter.</p>
        </div>
      )}

      {!isLoading && !isError && items.length > 0 && (
        <div className="bg-white rounded-xl border border-[#bec9bf]/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#bec9bf]/40 bg-[#fdf8f3]">
                  {['Applicant', 'Solid Mineral', 'Destination', 'Status', 'Submitted', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-[#8A7E6E] text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#bec9bf]/20">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-[#fdf8f3] transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#221a0f]">{item.companyName}</p>
                      {item.membershipId && <p className="text-xs text-[#8A7E6E] font-mono">{item.membershipId}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[#221a0f] max-w-[200px] truncate">{item.solidMineralName}</p>
                    </td>
                    <td className="px-4 py-3 text-[#221a0f]">{item.destinationCountry}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[item.status]}>{statusLabel[item.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[#8A7E6E] text-xs">
                      {new Date(item.createdAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2 items-center">
                        {/* submitted — admin can start review or wait for payment */}
                        {item.status === 'submitted' && !isReadOnly && (
                          <button
                            onClick={() => handleAction(item, 'start_review')}
                            className="text-xs font-semibold text-white bg-[#023293] hover:bg-[#001533] rounded-md px-2.5 py-1 transition-colors"
                          >
                            Start Review
                          </button>
                        )}
                        {item.status === 'submitted' && isReadOnly && (
                          <span className="text-xs text-[#8A7E6E] italic">Awaiting review</span>
                        )}
                        {item.status === 'pending_payment' && (
                          <span className="text-xs text-[#8A7E6E] italic">Payment processing…</span>
                        )}

                        {/* Review actions — only for non-read-only admins on actionable statuses */}
                        {!isReadOnly && ['under_review', 'revision_requested'].includes(item.status) && (
                          <button
                            onClick={() => handleAction(item, 'approve')}
                            className="text-xs font-semibold text-white bg-[#023293] hover:bg-[#0267bf] rounded-md px-2.5 py-1 transition-colors"
                          >
                            Approve
                          </button>
                        )}
                        {!isReadOnly && item.status === 'under_review' && (
                          <>
                            <button
                              onClick={() => handleAction(item, 'request_revision')}
                              className="text-xs font-medium text-[#795900] border border-[#bec9bf]/60 rounded-md px-2.5 py-1 hover:bg-[#fdf8f3] transition-colors"
                            >
                              Request Revision
                            </button>
                            <button
                              onClick={() => handleAction(item, 'reject')}
                              className="text-xs font-medium text-red-600 border border-red-200 rounded-md px-2.5 py-1 hover:bg-red-50 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {/* Certificate actions once issued */}
                        {item.certificatePdfUrl && (
                          <CertDownloadButtons certId={item.id} />
                        )}

                        {/* View detail — always visible */}
                        <Link
                          to={`/dashboard/eco/${item.id}`}
                          className="text-xs font-medium text-[#023293] hover:underline"
                        >
                          Details
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
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
      <button
        disabled={isLoading}
        onClick={handlePay}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-60"
        style={{ background: '#023293' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
          {isLoading ? 'hourglass_empty' : 'payments'}
        </span>
        {isLoading ? 'Redirecting…' : 'Pay Application Fee'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
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
    return <p className="text-xs font-semibold text-[#023293]">✓ Confirmed — your application is now under review.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        disabled={isLoading}
        onClick={handleVerify}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-60"
        style={{ background: '#795900' }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>
          {isLoading ? 'hourglass_empty' : 'verified'}
        </span>
        {isLoading ? 'Verifying…' : 'I already paid — Verify Payment'}
      </button>
      {status === 'failed' && (
        <p className="text-xs text-red-600">Could not confirm — please try again.</p>
      )}
      {status === 'not_confirmed' && (
        <p className="text-xs text-[#795900]">
          Paystack hasn&apos;t confirmed the payment yet. Wait a moment then try again.
        </p>
      )}
    </div>
  );
}

// ── Member Certificate List ───────────────────────────────────────────────

function MemberEcoView() {
  const { data: certs, isLoading, isError, isFetching, refetch } = useGetEcoCertificatesQuery();

  // hasCachedData: a previous successful load exists — show stale data rather than a hard error
  const hasCachedData = Array.isArray(certs);

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#221a0f]">eCO Certificates</h1>
          <p className="text-sm text-[#8A7E6E] mt-0.5">Electronic Certificate of Origin applications.</p>
        </div>
        <Link to="/dashboard/eco/apply">
          <Button>+ New Application</Button>
        </Link>
      </div>

      {isLoading && <SkeletonCard />}

      {/* Hard error: only when there is no cached data to show */}
      {isError && !hasCachedData && <ErrorBanner message="Failed to load certificates." />}

      {/* Soft error: when a background refetch fails but cached data is still visible */}
      {isError && hasCachedData && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg text-xs text-[#795900] bg-[#fff2e2] border border-[#ffc641]/40">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>sync_problem</span>
          Could not refresh — showing last loaded data.
          <button onClick={() => refetch()} disabled={isFetching} className="ml-auto underline disabled:opacity-50">
            {isFetching ? 'Refreshing…' : 'Retry'}
          </button>
        </div>
      )}

      {!isLoading && !isError && (certs ?? []).length === 0 && (
        <div className="bg-white rounded-xl border border-[#bec9bf]/40 p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-[#023293]/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#023293]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-base font-medium text-[#221a0f] mb-1">No certificates yet</h3>
          <p className="text-sm text-[#8A7E6E] mb-4">Apply for your first Certificate of Origin to get started.</p>
          <Link to="/dashboard/eco/apply"><Button>Apply Now</Button></Link>
        </div>
      )}

      {!isLoading && !isError && (certs ?? []).length > 0 && (
        <div className="space-y-3">
          {(certs ?? []).map((cert) => {
            const isEditableDraft = cert.status === 'draft' || cert.status === 'revision_requested';
            const isPayable = cert.status === 'submitted';
            const isPendingPayment = cert.status === 'pending_payment';
            const isIssued = cert.status === 'issued';
            return (
              <div key={cert.id}
                className={`bg-white rounded-xl border p-4 sm:p-5 transition-colors ${
                  isPayable
                    ? 'border-amber-300 bg-amber-50/30 hover:bg-amber-50/60'
                    : 'border-[#bec9bf]/40 hover:bg-[#fdf8f3]'
                }`}>
                {/* Top row: cert number + status badge */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <Link to={`/dashboard/eco/${cert.id}`}
                      className="text-sm font-mono font-semibold text-[#023293] hover:underline flex-shrink-0">
                      {cert.certificateNumber ?? cert.id.slice(0, 8).toUpperCase()}
                    </Link>
                    <Badge variant={statusVariant[cert.status]}>{statusLabel[cert.status]}</Badge>
                  </div>
                  <span className="text-xs text-[#8A7E6E] flex-shrink-0">
                    {new Date(cert.createdAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>

                {/* Payment prompt banner — shown when action is required */}
                {isPayable && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-amber-100 border border-amber-200">
                    <span className="material-symbols-outlined text-amber-700 flex-shrink-0" style={{ fontSize: 16, fontVariationSettings: `'FILL' 1` }}>warning</span>
                    <p className="text-xs text-amber-800 font-medium">
                      {cert.status === 'submitted'
                        ? 'Payment required — your application is pending payment of the processing fee.'
                        : 'Payment initiated — if you completed the payment, click "I already paid — Verify Payment" below.'}
                    </p>
                  </div>
                )}

                {/* Details row */}
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mb-3">
                  <span className="text-xs text-[#8A7E6E]">
                    <span className="font-medium text-[#44474e]">To:</span> {cert.destinationCountry || '—'}
                  </span>
                  <span className="text-xs text-[#8A7E6E] truncate max-w-xs">
                    <span className="font-medium text-[#44474e]">Mineral:</span> {cert.solidMineralName || '—'}
                  </span>
                  {cert.applicationFee != null && cert.applicationFee > 0 && (
                    <span className="text-xs text-[#8A7E6E]">
                      <span className="font-medium text-[#44474e]">Fee:</span> ₦{cert.applicationFee}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-start gap-2">
                  {isPayable && <PayButton certId={cert.id} />}
                  {isPendingPayment && cert.paymentRef && (
                    <VerifyPaymentButton certRef={cert.paymentRef} onConfirmed={refetch} />
                  )}
                  {isPendingPayment && !cert.paymentRef && (
                    <PayButton certId={cert.id} />
                  )}

                  <Link to={`/dashboard/eco/${cert.id}`}
                    className="flex items-center gap-1 rounded-lg border border-[#bec9bf]/60 px-2.5 py-1.5 text-xs font-semibold text-[#44474e] hover:border-[#221a0f] transition-colors">
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
                    Details
                  </Link>
                  {isEditableDraft && (
                    <Link to={`/dashboard/eco/apply/${cert.id}`}
                      className="flex items-center gap-1 rounded-lg border border-[#bec9bf]/60 px-2.5 py-1.5 text-xs font-semibold text-[#023293] hover:bg-[#f0faf4] transition-colors">
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>edit</span>
                      {cert.status === 'draft' ? 'Continue' : 'Edit & Resubmit'}
                    </Link>
                  )}
                  {isIssued && <CertActionButtons certId={cert.id} compact />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* "Try again" only when the hard error state is showing (no cached data) */}
      {isError && !hasCachedData && (
        <button onClick={() => refetch()} className="mt-4 text-sm text-[#023293] hover:underline">
          Try again
        </button>
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

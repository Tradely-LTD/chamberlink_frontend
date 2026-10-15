import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import {
  useGetMyBoothsQuery,
  useInitiateBoothPaymentMutation,
  useVerifyBoothPaymentMutation,
  type MyBooth,
} from '@features/trade-fair';
import { PageHeader } from '@shared/ui/PageHeader';

// ── Demo data ─────────────────────────────────────────────────────────────


const statusConfig: Record<MyBooth['status'], { label: string; bg: string; text: string }> = {
  reserved:        { label: 'Reserved',        bg: 'rgb(var(--c-success-bg))', text: 'rgb(var(--c-success))' },
  checked_in:      { label: 'Checked In',      bg: 'rgb(var(--c-primary-soft))', text: 'rgb(var(--c-primary))' },
  pending_payment: { label: 'Pending Payment', bg: 'rgb(var(--c-warning-bg))', text: 'rgb(var(--c-warning))' },
  cancelled:       { label: 'Cancelled',       bg: 'rgb(var(--c-danger-bg))', text: 'rgb(var(--c-danger))' },
};

// ── Page ──────────────────────────────────────────────────────────────────

export function TradeFairBoothsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Paystack appends ?reference=xxx (and ?trxref=xxx) after redirecting back
  const callbackRef = searchParams.get('reference') ?? searchParams.get('trxref') ?? null;

  const { data, isLoading } = useGetMyBoothsQuery();
  const [initiatePayment, { isLoading: payLoading }] = useInitiateBoothPaymentMutation();
  const [verifyPayment, { isLoading: verifying }] = useVerifyBoothPaymentMutation();

  const [payError, setPayError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [verifyState, setVerifyState] = useState<'idle' | 'success' | 'pending'>('idle');
  const verifyFired = useRef(false);

  // On return from payment gateway: verify once, then clean up the URL
  useEffect(() => {
    if (!callbackRef || verifyFired.current) return;
    verifyFired.current = true;

    verifyPayment(callbackRef)
      .unwrap()
      .then((result) => {
        setVerifyState(result.confirmed ? 'success' : 'pending');
      })
      .catch(() => {
        setVerifyState('pending');
      })
      .finally(() => {
        // Strip the gateway params so a hard refresh doesn't re-verify
        setSearchParams({}, { replace: true });
      });
  }, [callbackRef, verifyPayment, setSearchParams]);

  const booths = data ?? [];

  const handlePay = async (reservationId: string) => {
    setPayError(null);
    setPayingId(reservationId);
    try {
      const result = await initiatePayment({
        reservationId,
        callbackUrl: `${window.location.origin}/dashboard/trade-fair/booths`,
      }).unwrap();
      window.location.href = result.authorizationUrl;
    } catch {
      setPayError('Payment service unavailable. Please try again.');
      setPayingId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8 [&>*]:max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link to="/dashboard/trade-fair" className="text-ink-subtle hover:text-ink flex items-center gap-1">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_back</span>
          Trade Fair
        </Link>
        <span className="material-symbols-outlined text-ink-subtle" style={{ fontSize: 14 }}>chevron_right</span>
        <span className="text-ink font-medium">My Booths</span>
      </div>

      <PageHeader title="My Booth Reservations" description="Your reserved exhibition booths." />

      {/* Payment verification banner */}
      {verifying && (
        <div className="mb-4 flex items-center gap-3 rounded-card border border-primary-soft bg-primary-soft px-4 py-3 text-sm text-primary">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent flex-shrink-0" />
          Verifying your payment…
        </div>
      )}
      {!verifying && verifyState === 'success' && (
        <div className="mb-4 flex items-center gap-3 rounded-card border border-success-bg bg-[#f0fdf6] px-4 py-3 text-sm text-success">
          <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 18, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 18` }}>check_circle</span>
          Payment confirmed! Your booth reservation is now active.
        </div>
      )}
      {!verifying && verifyState === 'pending' && (
        <div className="mb-4 flex items-center gap-3 rounded-card border border-warning-bg bg-warning-bg px-4 py-3 text-sm text-warning">
          <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 18, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 18` }}>info</span>
          Payment is being processed. Your booking will update shortly once confirmed.
        </div>
      )}

      {payError && <div className="mb-4"><ErrorBanner message={payError} /></div>}
      {isLoading && <SkeletonCard />}

      {!isLoading && booths.length === 0 ? (
        <div className="bg-surface rounded-card border border-border p-12 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgb(var(--c-primary-soft))' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 32`, color: 'rgb(var(--c-primary))' }}>storefront</span>
          </div>
          <h3 className="text-base font-semibold text-ink mb-1">No booth reservations yet</h3>
          <p className="text-sm text-ink-subtle mb-4">Book a booth at an upcoming trade fair event.</p>
          <Link to="/dashboard/trade-fair">
            <button className="inline-flex items-center justify-center gap-2 h-10 px-4 text-sm rounded-control bg-primary text-white font-medium shadow-card transition-colors hover:bg-primary-hover focus-visible:shadow-focus disabled:opacity-50 disabled:cursor-not-allowed">
              Browse Events
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {booths.map((booth) => {
            const cfg = statusConfig[booth.status];
            return (
              <div key={booth.id} className="bg-surface rounded-card border border-border overflow-hidden">
                <div className="px-6 pt-5 pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-card flex items-center justify-center flex-shrink-0" style={{ background: 'rgb(var(--c-primary-soft))' }}>
                        <span className="font-semibold text-primary text-sm leading-none text-center">{booth.boothNumber}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-ink">{booth.boothType} Booth</p>
                        {booth.zone && <p className="text-xs text-ink-subtle mt-0.5">{booth.zone}</p>}
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" style={{ background: cfg.bg, color: cfg.text }}>
                      {cfg.label}
                    </span>
                  </div>

                  <dl className="grid grid-cols-2 gap-3 text-sm mb-4">
                    <div>
                      <dt className="text-xs text-ink-subtle mb-0.5">Event</dt>
                      <dd className="font-medium text-ink">{booth.eventTitle}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-ink-subtle mb-0.5">Event Date</dt>
                      <dd className="text-ink">
                        {new Date(booth.eventStartDate).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' })}
                      </dd>
                    </div>
                    {booth.size && (
                      <div>
                        <dt className="text-xs text-ink-subtle mb-0.5">Size</dt>
                        <dd className="text-ink">{booth.size}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-xs text-ink-subtle mb-0.5">Amount Paid</dt>
                      <dd className="font-semibold text-ink">₦{booth.amount.toLocaleString()}</dd>
                    </div>
                    {booth.paymentRef && (
                      <div>
                        <dt className="text-xs text-ink-subtle mb-0.5">Payment Ref</dt>
                        <dd className="font-mono text-xs text-ink">{booth.paymentRef}</dd>
                      </div>
                    )}
                  </dl>

                  <div className="flex flex-wrap gap-3">
                    {booth.status === 'pending_payment' && (
                      <button
                        disabled={payLoading && payingId === booth.id}
                        onClick={() => handlePay(booth.id)}
                        className="flex items-center gap-2 disabled:opacity-50 h-10 px-4 text-sm rounded-control bg-primary text-white font-medium shadow-card transition-colors hover:bg-primary-hover focus-visible:shadow-focus disabled:opacity-50 disabled:cursor-not-allowed"
                       
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>payments</span>
                        {payLoading && payingId === booth.id ? 'Processing…' : 'Complete Payment'}
                      </button>
                    )}
                    {(booth.status === 'reserved' || booth.status === 'checked_in') && booth.receiptUrl && (
                      <a
                        href={booth.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary hover:text-white transition-colors"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                        Download Receipt
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

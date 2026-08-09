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

// ── Demo data ─────────────────────────────────────────────────────────────

const demoBooths: MyBooth[] = [
  {
    id: '1',
    boothId: 'b1',
    eventId: 'evt-1',
    boothNumber: 'A-01',
    boothType: 'Standard',
    zone: 'Zone A — Textile & Apparel',
    eventTitle: 'NACCIMA Annual Trade Fair 2025',
    eventStartDate: '2025-11-10T00:00:00Z',
    size: '3×3m',
    amount: 150000,
    status: 'reserved',
    paymentRef: 'PAY-TF-2025-001',
    receiptUrl: null,
    createdAt: '2025-08-01T00:00:00Z',
  },
];

const statusConfig: Record<MyBooth['status'], { label: string; bg: string; text: string }> = {
  reserved:        { label: 'Reserved',        bg: '#a0f4ca', text: '#005137' },
  checked_in:      { label: 'Checked In',      bg: '#d6e3ff', text: '#023293' },
  pending_payment: { label: 'Pending Payment', bg: '#ffdea5', text: '#5d4201' },
  cancelled:       { label: 'Cancelled',       bg: '#ffdad6', text: '#93000a' },
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

  const booths = data ?? (isLoading ? [] : demoBooths);

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
    <div className="p-6 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link to="/dashboard/trade-fair" className="text-[#74777f] hover:text-[#191c1e] flex items-center gap-1">
          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_back</span>
          Trade Fair
        </Link>
        <span className="material-symbols-outlined text-[#c4c6cf]" style={{ fontSize: 14 }}>chevron_right</span>
        <span className="text-[#191c1e] font-medium">My Booths</span>
      </div>

      <h1 className="text-xl font-semibold text-[#191c1e] mb-1">My Booth Reservations</h1>
      <p className="text-sm text-[#74777f] mb-6">Your reserved exhibition booths.</p>

      {/* Payment verification banner */}
      {verifying && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#d6e3ff] bg-[#f0f4ff] px-4 py-3 text-sm text-[#023293]">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#023293] border-t-transparent flex-shrink-0" />
          Verifying your payment…
        </div>
      )}
      {!verifying && verifyState === 'success' && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#a0f4ca] bg-[#f0fdf6] px-4 py-3 text-sm text-[#005137]">
          <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 18, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 18` }}>check_circle</span>
          Payment confirmed! Your booth reservation is now active.
        </div>
      )}
      {!verifying && verifyState === 'pending' && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-[#ffdea5] bg-[#fffbf0] px-4 py-3 text-sm text-[#5d4201]">
          <span className="material-symbols-outlined flex-shrink-0" style={{ fontSize: 18, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 18` }}>info</span>
          Payment is being processed. Your booking will update shortly once confirmed.
        </div>
      )}

      {payError && <div className="mb-4"><ErrorBanner message={payError} /></div>}
      {isLoading && <SkeletonCard />}

      {!isLoading && booths.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#e0e3e5] p-12 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#d6e3ff' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 32`, color: '#023293' }}>storefront</span>
          </div>
          <h3 className="text-base font-semibold text-[#191c1e] mb-1">No booth reservations yet</h3>
          <p className="text-sm text-[#74777f] mb-4">Book a booth at an upcoming trade fair event.</p>
          <Link to="/dashboard/trade-fair">
            <button className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white" style={{ background: '#023293' }}>
              Browse Events
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {booths.map((booth) => {
            const cfg = statusConfig[booth.status];
            return (
              <div key={booth.id} className="bg-white rounded-xl border border-[#e0e3e5] overflow-hidden">
                <div className="px-6 pt-5 pb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#d6e3ff' }}>
                        <span className="font-bold text-[#023293] text-sm leading-none text-center">{booth.boothNumber}</span>
                      </div>
                      <div>
                        <p className="font-bold text-[#191c1e]">{booth.boothType} Booth</p>
                        {booth.zone && <p className="text-xs text-[#74777f] mt-0.5">{booth.zone}</p>}
                      </div>
                    </div>
                    <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" style={{ background: cfg.bg, color: cfg.text }}>
                      {cfg.label}
                    </span>
                  </div>

                  <dl className="grid grid-cols-2 gap-3 text-sm mb-4">
                    <div>
                      <dt className="text-xs text-[#74777f] mb-0.5">Event</dt>
                      <dd className="font-medium text-[#191c1e]">{booth.eventTitle}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-[#74777f] mb-0.5">Event Date</dt>
                      <dd className="text-[#191c1e]">
                        {new Date(booth.eventStartDate).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' })}
                      </dd>
                    </div>
                    {booth.size && (
                      <div>
                        <dt className="text-xs text-[#74777f] mb-0.5">Size</dt>
                        <dd className="text-[#191c1e]">{booth.size}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-xs text-[#74777f] mb-0.5">Amount Paid</dt>
                      <dd className="font-bold text-[#191c1e]">₦{booth.amount.toLocaleString()}</dd>
                    </div>
                    {booth.paymentRef && (
                      <div>
                        <dt className="text-xs text-[#74777f] mb-0.5">Payment Ref</dt>
                        <dd className="font-mono text-xs text-[#191c1e]">{booth.paymentRef}</dd>
                      </div>
                    )}
                  </dl>

                  <div className="flex flex-wrap gap-3">
                    {booth.status === 'pending_payment' && (
                      <button
                        disabled={payLoading && payingId === booth.id}
                        onClick={() => handlePay(booth.id)}
                        className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                        style={{ background: '#023293' }}
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
                        className="flex items-center gap-2 rounded-lg border border-[#023293] px-4 py-2 text-sm font-medium text-[#023293] hover:bg-[#023293] hover:text-white transition-colors"
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

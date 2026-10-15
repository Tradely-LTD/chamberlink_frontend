import { plainText } from '@shared/utils/plainText';
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { StatTile } from '@shared/ui/StatTile';
import { Button } from '@shared/ui/Button';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { Select } from '@shared/ui/Select';
import { useAppSelector } from '@shared/hooks/useAppDispatch';
import { skipToken } from '@reduxjs/toolkit/query/react';
import {
  useGetTradeFairEventsQuery,
  useGetAdminTradeFairEventsQuery,
  useGetAvailableBoothsQuery,
  useReserveBoothMutation,
  useVerifyBoothPaymentMutation,
  useGetAllBookingsQuery,
  useAddBoothMutation,
  useUpdateBoothMutation,
  useGetAllAdminBoothsQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  type TradeFairEvent,
  type TradeFairBooth,
  type AdminBooking,
} from '@features/trade-fair';
import { PageHeader } from '@shared/ui/PageHeader';

// ── Helpers ────────────────────────────────────────────────────────────────

const ADMIN_ROLES = ['chamber_admin', 'chamber_executive', 'super_admin', 'staff_operator'];

function countdown(targetDate: string) {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { days, hours, mins };
}

const statusConfig: Record<TradeFairEvent['status'], { label: string; bg: string; text: string }> = {
  draft:                { label: 'Draft',                bg: 'rgb(var(--c-border))', text: 'rgb(var(--c-ink-muted))' },
  open_for_registration: { label: 'Open for Registration', bg: 'rgb(var(--c-success-bg))', text: 'rgb(var(--c-success))' },
  upcoming:             { label: 'Upcoming',             bg: 'rgb(var(--c-warning-bg))', text: 'rgb(var(--c-warning))' },
  ongoing:              { label: 'Ongoing',              bg: 'rgb(var(--c-success-bg))', text: 'rgb(var(--c-success))' },
  completed:            { label: 'Completed',            bg: 'rgb(var(--c-border))', text: 'rgb(var(--c-ink-muted))' },
  cancelled:            { label: 'Cancelled',            bg: 'rgb(var(--c-danger-bg))', text: 'rgb(var(--c-danger))' },
};

const bookingStatusConfig: Record<AdminBooking['status'], { label: string; bg: string; text: string }> = {
  reserved:        { label: 'Reserved',        bg: 'rgb(var(--c-success-bg))', text: 'rgb(var(--c-success))' },
  checked_in:      { label: 'Checked In',      bg: 'rgb(var(--c-primary-soft))', text: 'rgb(var(--c-primary))' },
  pending_payment: { label: 'Pending Payment', bg: 'rgb(var(--c-warning-bg))', text: 'rgb(var(--c-warning))' },
  cancelled:       { label: 'Cancelled',       bg: 'rgb(var(--c-danger-bg))', text: 'rgb(var(--c-danger))' },
};

// ── Booth Booking Modal (member) ───────────────────────────────────────────

function BoothBookingModal({ event, onClose }: { event: TradeFairEvent; onClose: () => void }) {
  const navigate = useNavigate();
  const { data: booths, isLoading } = useGetAvailableBoothsQuery(event.id);
  const [reserveBooth, { isLoading: reserving }] = useReserveBoothMutation();
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allBooths = booths ?? [];
  const selectedBooth = allBooths.find((b) => b.id === selected);

  // Group by zone
  const zones = Array.from(new Set(allBooths.map((b) => b.zone)));

  const handleReserve = async () => {
    if (!selected) return;
    setError(null);
    try {
      const result = await reserveBooth({
        eventId: event.id,
        boothId: selected,
        callbackUrl: `${window.location.origin}/dashboard/trade-fair`,
      }).unwrap();

      if (result.alreadyPaid) {
        onClose();
        navigate('/dashboard/trade-fair/booths');
      } else if (result.authorizationUrl) {
        window.location.href = result.authorizationUrl;
      }
    } catch {
      setError('Reservation failed. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className="relative bg-surface rounded-card border border-border shadow-pop animate-fade-up w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-border px-5 py-4 flex items-center justify-between rounded-t-card">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Select a Booth</h2>
            <p className="text-sm text-ink-subtle mt-0.5">{plainText(event.title)}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-alt text-ink-subtle">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <div className="p-6">
          {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

          {isLoading ? <SkeletonCard /> : (
            <>
              {zones.map((zone) => (
                <div key={zone} className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-ink-subtle" style={{ fontSize: 16, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 16` }}>location_on</span>
                    <p className="text-2xs font-semibold text-ink-subtle uppercase">{zone}</p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {allBooths.filter((b) => b.zone === zone).map((booth) => {
                      const isAvailable = booth.status === 'available';
                      const isSelected = selected === booth.id;
                      return (
                        <button
                          key={booth.id}
                          disabled={!isAvailable}
                          onClick={() => isAvailable && setSelected(booth.id)}
                          className={`rounded-card border p-4 text-left transition-all ${
                            isSelected
                              ? 'border-primary ring-2 ring-primary/20'
                              : isAvailable
                              ? 'border-border hover:border-primary/40 bg-surface'
                              : 'border-border bg-surface-alt opacity-50 cursor-not-allowed'
                          }`}
                          style={isSelected ? { background: 'rgb(var(--c-primary-soft))' } : {}}
                        >
                          <p className="font-semibold text-primary text-base">{booth.boothNumber}</p>
                          <p className="text-xs text-ink-subtle mt-0.5">{booth.boothType}</p>
                          <p className="text-xs text-ink-subtle">{booth.size}</p>
                          <p className="text-sm font-semibold text-ink mt-2">₦{booth.price.toLocaleString()}</p>
                          {!isAvailable && (
                            <span className="inline-flex items-center mt-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: 'rgb(var(--c-danger-bg))', color: 'rgb(var(--c-danger))' }}>Reserved</span>
                          )}
                          {isSelected && (
                            <span className="inline-flex items-center mt-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: 'rgb(var(--c-primary-soft))', color: 'rgb(var(--c-primary))' }}>Selected</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Summary */}
              {selectedBooth && (
                <div className="rounded-card border border-primary/20 p-4 mb-6" style={{ background: 'rgb(var(--c-primary-soft))' }}>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">Booking Summary</p>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <span className="text-ink-subtle">Booth</span>
                    <span className="font-semibold text-ink">{selectedBooth.boothNumber}, {selectedBooth.boothType}</span>
                    <span className="text-ink-subtle">Zone</span>
                    <span className="text-ink">{selectedBooth.zone}</span>
                    <span className="text-ink-subtle">Size</span>
                    <span className="text-ink">{selectedBooth.size}</span>
                    <span className="text-ink-subtle">Amount</span>
                    <span className="font-semibold text-primary text-base">₦{selectedBooth.price.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-ink-subtle mt-3">You will be redirected to complete payment. Booth is reserved upon payment confirmation.</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <button
                  disabled={!selected || reserving}
                  onClick={handleReserve}
                  className="flex-1 flex items-center justify-center gap-2 disabled:opacity-50 h-10 px-4 text-sm rounded-control bg-primary text-white font-medium shadow-card transition-colors hover:bg-primary-hover focus-visible:shadow-focus disabled:opacity-50 disabled:cursor-not-allowed"
                 
                >
                  {reserving ? 'Processing…' : (
                    <>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>payments</span>
                      Proceed to Payment
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add Booth Modal (admin) ────────────────────────────────────────────────

function AddBoothModal({ eventId: initialEventId, events, onClose }: { eventId: string; events: TradeFairEvent[]; onClose: () => void }) {
  const [addBooth, { isLoading }] = useAddBoothMutation();
  const [error, setError] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState(initialEventId);
  const [form, setForm] = useState({ boothNumber: '', boothType: 'Standard', zone: '', size: '3×3m', price: '' });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedEventId) { setError('Please select an event.'); return; }
    try {
      await addBooth({ eventId: selectedEventId, ...form, price: Number(form.price) }).unwrap();
      onClose();
    } catch {
      setError('Failed to add booth. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className="relative bg-surface rounded-card border border-border shadow-pop animate-fade-up w-full max-w-md">
        <div className="border-b border-border px-5 py-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink">Add New Booth</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-alt text-ink-subtle">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <ErrorBanner message={error} />}

          {/* Event selector */}
          <div>
            <label className="block text-[13px] font-medium text-ink mb-1.5">Event</label>
            <Select
              label="Event"
              hideLabel
              value={selectedEventId}
              onValueChange={setSelectedEventId}
              placeholder="Select an event…"
              options={events.map((ev) => ({ value: ev.id, label: `${plainText(ev.title)} (${ev.status})` }))}
            />
          </div>

          {[
            { label: 'Booth Number', key: 'boothNumber' as const, placeholder: 'e.g. A-05' },
            { label: 'Zone / Location', key: 'zone' as const, placeholder: 'e.g. Zone A: Textile & Apparel' },
            { label: 'Size', key: 'size' as const, placeholder: 'e.g. 3×3m' },
            { label: 'Price (₦)', key: 'price' as const, placeholder: 'e.g. 150000' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-[13px] font-medium text-ink mb-1.5">{label}</label>
              <input
                required
                value={form[key]}
                onChange={set(key)}
                placeholder={placeholder}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-primary"
                style={{ '--tw-ring-color': 'rgb(var(--c-primary))' } as React.CSSProperties}
              />
            </div>
          ))}
          <div>
            <label className="block text-[13px] font-medium text-ink mb-1.5">Booth Type</label>
            <Select
              label="Booth Type"
              hideLabel
              value={form.boothType}
              onValueChange={(v) => setForm((f) => ({ ...f, boothType: v }))}
              options={['Standard', 'Premium', 'Corner Pavilion', 'Food Court', 'Open Space'].map((t) => ({ value: t, label: t }))}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 flex-1 disabled:opacity-50 h-10 px-4 text-sm rounded-control bg-primary text-white font-medium shadow-card transition-colors hover:bg-primary-hover focus-visible:shadow-focus disabled:opacity-50 disabled:cursor-not-allowed"
             
            >
              {isLoading ? 'Adding…' : 'Add Booth'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Create Event Modal (admin) ─────────────────────────────────────────────

function CreateEventModal({ onClose }: { onClose: () => void }) {
  const [createEvent, { isLoading }] = useCreateEventMutation();
  const [error, setError] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    venue: '',
    startDate: '',
    endDate: '',
    registrationDeadline: '',
    description: '',
    hostSharePct: '90',
    tradelySharePct: '10',
  });

  const setField = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShareError(null);

    const kPct = Number(form.hostSharePct);
    const tPct = Number(form.tradelySharePct);
    if (kPct + tPct !== 100) {
      setShareError('Host share + Tradely share must equal 100.');
      return;
    }

    try {
      await createEvent({
        title: form.title,
        venue: form.venue,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        hostSharePct: kPct,
        tradelySharePct: tPct,
        ...(form.registrationDeadline ? { registrationDeadline: new Date(form.registrationDeadline).toISOString() } : {}),
        ...(form.description ? { description: form.description } : {}),
      }).unwrap();
      onClose();
    } catch {
      setError('Failed to create event. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className="relative bg-surface rounded-card border border-border shadow-pop animate-fade-up w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="border-b border-border px-5 py-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-ink">Create New Event</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-alt text-ink-subtle">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <ErrorBanner message={error} />}
          <div>
            <label className="block text-[13px] font-medium text-ink mb-1.5">Title</label>
            <input
              required
              value={form.title}
              onChange={setField('title')}
              placeholder="e.g. NACCIMA Annual Trade Fair 2026"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-primary"
              style={{ '--tw-ring-color': 'rgb(var(--c-primary))' } as React.CSSProperties}
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-ink mb-1.5">Venue</label>
            <input
              required
              value={form.venue}
              onChange={setField('venue')}
              placeholder="e.g. Kano Trade Fair Complex, Kano"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-primary"
              style={{ '--tw-ring-color': 'rgb(var(--c-primary))' } as React.CSSProperties}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-ink mb-1.5">Start Date</label>
              <input
                required
                type="date"
                value={form.startDate}
                onChange={setField('startDate')}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-primary"
                style={{ '--tw-ring-color': 'rgb(var(--c-primary))' } as React.CSSProperties}
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-ink mb-1.5">End Date</label>
              <input
                required
                type="date"
                value={form.endDate}
                onChange={setField('endDate')}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-primary"
                style={{ '--tw-ring-color': 'rgb(var(--c-primary))' } as React.CSSProperties}
              />
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-medium text-ink mb-1.5">Registration Deadline <span className="font-normal text-ink-subtle">(optional)</span></label>
            <input
              type="date"
              value={form.registrationDeadline}
              onChange={setField('registrationDeadline')}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-primary"
              style={{ '--tw-ring-color': 'rgb(var(--c-primary))' } as React.CSSProperties}
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-ink mb-1.5">Description <span className="font-normal text-ink-subtle">(optional)</span></label>
            <textarea
              value={form.description}
              onChange={setField('description')}
              rows={3}
              placeholder="Brief description of the event…"
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-primary resize-none"
              style={{ '--tw-ring-color': 'rgb(var(--c-primary))' } as React.CSSProperties}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-medium text-ink mb-1.5">Host Share (%)</label>
              <input
                required
                type="number"
                min={0}
                max={100}
                value={form.hostSharePct}
                onChange={setField('hostSharePct')}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-primary"
                style={{ '--tw-ring-color': 'rgb(var(--c-primary))' } as React.CSSProperties}
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-ink mb-1.5">Tradely Share (%)</label>
              <input
                required
                type="number"
                min={0}
                max={100}
                value={form.tradelySharePct}
                onChange={setField('tradelySharePct')}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-primary"
                style={{ '--tw-ring-color': 'rgb(var(--c-primary))' } as React.CSSProperties}
              />
            </div>
          </div>
          {shareError && (
            <p className="text-xs font-medium text-danger bg-danger-bg rounded-lg px-3 py-2">{shareError}</p>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 flex-1 disabled:opacity-50 h-10 px-4 text-sm rounded-control bg-primary text-white font-medium shadow-card transition-colors hover:bg-primary-hover focus-visible:shadow-focus disabled:opacity-50 disabled:cursor-not-allowed"
             
            >
              {isLoading ? 'Creating…' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Member View ────────────────────────────────────────────────────────────

function MemberTradeFairView() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // activeTenantId, not tenantId — tenantId is the staff/admin employer field
  // and is always null for a member (see AuthUser). Members browse trade fair
  // events for whichever chamber is currently their active workspace, and the
  // query re-keys automatically when that changes (ChamberSwitcher).
  const activeTenantId = useAppSelector((s) => s.auth.user?.activeTenantId);
  const { data: events, isLoading } = useGetTradeFairEventsQuery(activeTenantId ?? skipToken);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [bookingEvent, setBookingEvent] = useState<TradeFairEvent | null>(null);

  // Payment callback: Paystack appends ?reference=xxx after redirecting back.
  // Verify once then redirect to My Booths where the confirmed status is shown.
  const callbackRef = searchParams.get('reference') ?? searchParams.get('trxref') ?? null;
  const [verifyPayment] = useVerifyBoothPaymentMutation();
  const verifyFired = useRef(false);

  useEffect(() => {
    if (!callbackRef || verifyFired.current) return;
    verifyFired.current = true;
    verifyPayment(callbackRef)
      .finally(() => {
        setSearchParams({}, { replace: true });
        navigate('/dashboard/trade-fair/booths', { replace: true });
      });
  }, [callbackRef, verifyPayment, navigate, setSearchParams]);

  const allEvents = events ?? [];
  const upcomingEvents = allEvents.filter((e) => e.status !== 'completed' && e.status !== 'cancelled');
  const pastEvents = allEvents.filter((e) => e.status === 'completed' || e.status === 'cancelled');
  const displayed = tab === 'upcoming' ? upcomingEvents : pastEvents;

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8 [&>*]:max-w-4xl">
      {bookingEvent && <BoothBookingModal event={bookingEvent} onClose={() => setBookingEvent(null)} />}

      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Trade Fair" description="Upcoming events and booth registrations." />
        <Link to="/dashboard/trade-fair/booths">
          <button className="flex items-center gap-2 h-10 px-4 text-sm rounded-control border border-border-strong bg-surface text-ink font-medium shadow-card transition-colors hover:bg-surface-alt focus-visible:shadow-focus disabled:opacity-50 disabled:cursor-not-allowed">
            <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 16` }}>storefront</span>
            My Booths
          </button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-end gap-6 overflow-x-auto border-b border-border mb-6">
        {(['upcoming', 'past'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`-mb-px border-b-2 px-1 pb-2.5 pt-1 text-sm font-medium whitespace-nowrap transition-colors focus-visible:shadow-focus capitalize ${tab === t ? 'border-primary text-ink' : 'border-transparent text-ink-subtle hover:text-ink hover:border-border-strong'}`}>
            {t}
          </button>
        ))}
      </div>

      {isLoading && <SkeletonCard />}

      <div className="space-y-4">
        {!isLoading && displayed.length === 0 && (
          <div className="bg-surface rounded-card border border-border p-12 text-center">
            <p className="text-sm text-ink-subtle">No {tab} events at this time.</p>
          </div>
        )}
        {displayed.map((event) => {
          const st = event.status;
          const cfg = statusConfig[st];
          const cd = countdown(event.startDate);
          const start = new Date(event.startDate).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' });
          const end = new Date(event.endDate).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' });
          const deadline = event.registrationDeadline
            ? new Date(event.registrationDeadline).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' })
            : null;

          return (
            <div key={event.id} className="bg-surface rounded-card border border-border overflow-hidden">
              {/* Event header */}
              <div className="px-6 pt-5 pb-4">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h3 className="text-base font-semibold text-ink">{plainText(event.title)}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="material-symbols-outlined text-ink-subtle" style={{ fontSize: 14, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 14` }}>location_on</span>
                      <p className="text-sm text-ink-subtle">{event.venue}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold flex-shrink-0" style={{ background: cfg.bg, color: cfg.text }}>
                    {cfg.label}
                  </span>
                </div>

                {event.description && <p className="text-sm text-ink-subtle mb-4">{plainText(event.description)}</p>}

                {/* Countdown timer */}
                {cd && st !== 'completed' && st !== 'cancelled' && (
                  <div className="flex gap-3 mb-4">
                    {[{ v: cd.days, l: 'Days' }, { v: cd.hours, l: 'Hours' }, { v: cd.mins, l: 'Mins' }].map(({ v, l }) => (
                      <div key={l} className="flex flex-col items-center rounded-lg px-4 py-2.5 min-w-[64px]" style={{ background: 'rgb(var(--c-primary))' }}>
                        <span className="text-2xl font-semibold text-white leading-none">{String(v).padStart(2, '0')}</span>
                        <span className="text-xs text-primary-200 mt-0.5 font-medium">{l}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Details row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mb-4">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-ink-subtle" style={{ fontSize: 14 }}>calendar_today</span>
                    <span className="text-ink-subtle">{start} to {end}</span>
                  </div>
                  {event.boothsAvailable !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-ink-subtle" style={{ fontSize: 14 }}>storefront</span>
                      <span className="text-ink-subtle">{event.boothsAvailable} booths available</span>
                    </div>
                  )}
                  {deadline && (
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-ink-subtle" style={{ fontSize: 14 }}>event_busy</span>
                      <span className="text-ink-subtle">Deadline: {deadline}</span>
                    </div>
                  )}
                </div>

                {st === 'open_for_registration' && (
                  <button
                    onClick={() => setBookingEvent(event)}
                    className="flex items-center gap-2 h-10 px-4 text-sm rounded-control bg-primary text-white font-medium shadow-card transition-colors hover:bg-primary-hover focus-visible:shadow-focus disabled:opacity-50 disabled:cursor-not-allowed"
                   
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_business</span>
                    Book a Booth
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Edit Booth Modal (admin) ───────────────────────────────────────────────

function EditBoothModal({ booth, events, onClose }: { booth: TradeFairBooth; events: TradeFairEvent[]; onClose: () => void }) {
  const [updateBooth, { isLoading }] = useUpdateBoothMutation();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    eventId: booth.eventId ?? '',
    boothNumber: booth.boothNumber,
    boothType: booth.boothType,
    zone: booth.zone,
    size: booth.size,
    price: String(booth.price),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.eventId) { setError('Please select an event.'); return; }
    try {
      await updateBooth({
        boothId: booth.id,
        eventId: form.eventId,
        boothNumber: form.boothNumber,
        boothType: form.boothType,
        zone: form.zone,
        size: form.size,
        price: Number(form.price),
      }).unwrap();
      onClose();
    } catch {
      setError('Failed to update booth. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/50" onClick={onClose} />
      <div className="relative bg-surface rounded-card border border-border shadow-pop animate-fade-up w-full max-w-md">
        <div className="border-b border-border px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Edit Booth</h2>
            <p className="text-xs text-ink-subtle mt-0.5">ID: {booth.id}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-alt text-ink-subtle">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <ErrorBanner message={error} />}

          <div>
            <label className="block text-[13px] font-medium text-ink mb-1.5">Event *</label>
            <Select
              label="Event"
              hideLabel
              value={form.eventId}
              onValueChange={(v) => setForm((f) => ({ ...f, eventId: v }))}
              placeholder="Select an event…"
              options={events.map((ev) => ({ value: ev.id, label: `${plainText(ev.title)} (${ev.status})` }))}
            />
          </div>

          {[
            { label: 'Booth Number', key: 'boothNumber' as const, placeholder: 'e.g. A-05' },
            { label: 'Zone / Location', key: 'zone' as const, placeholder: 'e.g. Zone A' },
            { label: 'Size', key: 'size' as const, placeholder: 'e.g. 3×3m' },
            { label: 'Price (₦)', key: 'price' as const, placeholder: 'e.g. 150000' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-[13px] font-medium text-ink mb-1.5">{label}</label>
              <input required value={form[key]} onChange={set(key)} placeholder={placeholder}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-primary"
                style={{ '--tw-ring-color': 'rgb(var(--c-primary))' } as React.CSSProperties} />
            </div>
          ))}

          <div>
            <label className="block text-[13px] font-medium text-ink mb-1.5">Booth Type</label>
            <Select
              label="Booth Type"
              hideLabel
              value={form.boothType}
              onValueChange={(v) => setForm((f) => ({ ...f, boothType: v }))}
              options={['Standard', 'Premium', 'Corner Pavilion', 'Food Court', 'Open Space'].map((t) => ({ value: t, label: t }))}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <button type="submit" disabled={isLoading} className="inline-flex items-center justify-center gap-2 flex-1 disabled:opacity-50 h-10 px-4 text-sm rounded-control bg-primary text-white font-medium shadow-card transition-colors hover:bg-primary-hover focus-visible:shadow-focus disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Status transitions the admin can trigger
const STATUS_NEXT: Partial<Record<TradeFairEvent['status'], { value: string; label: string }[]>> = {
  draft:                  [{ value: 'upcoming', label: 'Publish as Upcoming' }, { value: 'open_for_registration', label: 'Open for Registration' }, { value: 'cancelled', label: 'Cancel Event' }],
  upcoming:               [{ value: 'open_for_registration', label: 'Open for Registration' }, { value: 'cancelled', label: 'Cancel Event' }],
  open_for_registration:  [{ value: 'ongoing', label: 'Mark as Ongoing' }, { value: 'cancelled', label: 'Cancel Event' }],
  ongoing:                [{ value: 'completed', label: 'Mark as Completed' }, { value: 'cancelled', label: 'Cancel Event' }],
};

// ── Admin View ─────────────────────────────────────────────────────────────

function AdminTradeFairView() {
  const { data: events, isLoading: eventsLoading } = useGetAdminTradeFairEventsQuery();
  const { data: bookings, isLoading: bookingsLoading } = useGetAllBookingsQuery({});
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  // Auto-select the first event once the list loads
  useEffect(() => {
    if (events && events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  // Booth inventory: load all booths when no event selected, or filtered by event
  const { data: allAdminBooths, isLoading: boothsLoading } = useGetAllAdminBoothsQuery(
    selectedEventId ? { eventId: selectedEventId } : {}
  );
  const [updateEvent] = useUpdateEventMutation();
  const [tab, setTab] = useState<'overview' | 'booths' | 'bookings'>('overview');
  const [showAddBooth, setShowAddBooth] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [editingBooth, setEditingBooth] = useState<TradeFairBooth | null>(null);
  const [statusChanging, setStatusChanging] = useState<string | null>(null);

  const handleStatusChange = async (eventId: string, status: string) => {
    setStatusChanging(eventId);
    try {
      await updateEvent({ eventId, status }).unwrap();
    } finally {
      setStatusChanging(null);
    }
  };
  const [boothFilter, setBoothFilter] = useState<'all' | 'available' | 'reserved'>('all');

  const allEvents = events ?? [];
  const allBookings = bookings ?? [];
  const allBooths = allAdminBooths ?? [];
  const filteredBooths = boothFilter === 'all' ? allBooths : allBooths.filter((b) => b.status === boothFilter);

  const totalBooths = allBooths.length;
  const reservedCount = allBooths.filter((b) => b.status === 'reserved').length;
  const availableCount = allBooths.filter((b) => b.status === 'available').length;
  const revenue = allBookings
    .filter((b) => b.status === 'reserved' || b.status === 'checked_in')
    .reduce((s, b) => s + b.amount, 0);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8">
      {showAddBooth && <AddBoothModal eventId={selectedEventId} events={allEvents} onClose={() => setShowAddBooth(false)} />}
      {showCreateEvent && <CreateEventModal onClose={() => setShowCreateEvent(false)} />}
      {editingBooth && <EditBoothModal booth={editingBooth} events={allEvents} onClose={() => setEditingBooth(null)} />}

      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Trade Fair Management" description="Manage events, booth inventory, and member bookings." />
        <div className="flex items-center gap-3">
          <Select
            label="Event"
            hideLabel
            value={selectedEventId}
            onValueChange={setSelectedEventId}
            className="text-ink"
            options={allEvents.map((e) => ({ value: e.id, label: e.title }))}
          />
          <button
            onClick={() => setShowCreateEvent(true)}
            className="flex items-center gap-2 h-10 px-4 text-sm rounded-control border border-border-strong bg-surface text-ink font-medium shadow-card transition-colors hover:bg-surface-alt focus-visible:shadow-focus disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_circle</span>
            Create Event
          </button>
          <button
            onClick={() => setShowAddBooth(true)}
            disabled={!selectedEventId}
            className="flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed h-10 px-4 text-sm rounded-control bg-primary text-white font-medium shadow-card transition-colors hover:bg-primary-hover focus-visible:shadow-focus disabled:opacity-50 disabled:cursor-not-allowed"
           
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
            Add Booth
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { icon: 'storefront', label: 'Total Booths', value: totalBooths, accent: true },
          { icon: 'check_circle', label: 'Reserved', value: reservedCount, accent: false },
          { icon: 'event_available', label: 'Available', value: availableCount, accent: false },
          { icon: 'payments', label: 'Revenue', value: `₦${(revenue / 1000).toFixed(0)}K`, accent: false },
        ].map(({ icon, label, value }) => (
          <StatTile key={label} icon={icon} label={label} value={String(value)} />
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-end gap-6 overflow-x-auto border-b border-border mb-6">
        {([['overview', 'Event Info'], ['booths', 'Booth Inventory'], ['bookings', 'All Bookings']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`-mb-px border-b-2 px-1 pb-2.5 pt-1 text-sm font-medium whitespace-nowrap transition-colors focus-visible:shadow-focus ${tab === id ? 'border-primary text-ink' : 'border-transparent text-ink-subtle hover:text-ink hover:border-border-strong'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Event Info tab */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {!eventsLoading && allEvents.length === 0 && (
            <div className="bg-surface rounded-card border border-border p-12 text-center">
              <p className="text-sm text-ink-subtle">No events found. Create one to get started.</p>
            </div>
          )}
          {allEvents.map((event) => {
            const cfg = statusConfig[event.status];
            const cd = countdown(event.startDate);
            const start = new Date(event.startDate).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' });
            const end = new Date(event.endDate).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' });
            return (
              <div key={event.id} className="bg-surface rounded-card border border-border p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-ink">{plainText(event.title)}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-ink-subtle" style={{ fontSize: 14, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 14` }}>location_on</span>
                      <p className="text-sm text-ink-subtle">{event.venue}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" style={{ background: cfg.bg, color: cfg.text }}>{cfg.label}</span>
                </div>
                {event.description && <p className="text-sm text-ink-subtle mb-4">{plainText(event.description)}</p>}
                {cd && event.status !== 'completed' && (
                  <div className="flex gap-3 mb-4">
                    {[{ v: cd.days, l: 'Days' }, { v: cd.hours, l: 'Hours' }, { v: cd.mins, l: 'Mins' }].map(({ v, l }) => (
                      <div key={l} className="flex flex-col items-center rounded-lg px-4 py-2.5" style={{ background: 'rgb(var(--c-primary))' }}>
                        <span className="text-xl font-semibold text-white leading-none">{String(v).padStart(2, '0')}</span>
                        <span className="text-xs text-primary-200 mt-0.5">{l}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                  <div><span className="text-ink-subtle">Date: </span><span className="text-ink font-medium">{start} to {end}</span></div>
                  {event.boothsAvailable !== undefined && (
                    <div><span className="text-ink-subtle">Booths: </span><span className="text-ink font-medium">{event.boothsAvailable} available</span></div>
                  )}
                </div>

                {/* Status transition controls */}
                {STATUS_NEXT[event.status] && (
                  <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-border-subtle">
                    <span className="text-xs text-ink-subtle font-medium">Change status:</span>
                    {STATUS_NEXT[event.status]!.map((next) => {
                      const isCancel = next.value === 'cancelled';
                      const isLoading = statusChanging === event.id;
                      return (
                        <button
                          key={next.value}
                          disabled={isLoading}
                          onClick={() => handleStatusChange(event.id, next.value)}
                          className="inline-flex items-center justify-center gap-2 disabled:opacity-50 h-8 px-3 text-[13px] rounded-control border border-border-strong bg-surface text-ink font-medium shadow-card transition-colors hover:bg-surface-alt focus-visible:shadow-focus disabled:opacity-50 disabled:cursor-not-allowed"
                          style={isCancel
                            ? { borderColor: 'rgb(var(--c-danger))', color: 'rgb(var(--c-danger))', background: 'transparent' }
                            : { borderColor: 'rgb(var(--c-primary))', color: 'rgb(var(--c-primary))', background: 'transparent' }}
                        >
                          {isLoading ? '…' : next.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {eventsLoading && <SkeletonCard />}
        </div>
      )}

      {/* Booth Inventory tab */}
      {tab === 'booths' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-1.5">
              {(['all', 'available', 'reserved'] as const).map((f) => (
                <button key={f} onClick={() => setBoothFilter(f)} className={`h-7 px-2.5 rounded-full border text-xs font-medium whitespace-nowrap transition-colors focus-visible:shadow-focus capitalize ${boothFilter === f ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-surface text-ink-muted hover:border-border-strong hover:text-ink'}`}>
                  {f}
                </button>
              ))}
            </div>
            <p className="text-sm text-ink-subtle">{filteredBooths.length} booths</p>
          </div>

          {boothsLoading ? <SkeletonCard /> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredBooths.map((booth) => {
                const eventName = allEvents.find((e) => e.id === booth.eventId)?.title;
                return (
                  <div
                    key={booth.id}
                    className="bg-surface rounded-card border p-4"
                    style={{ borderColor: booth.status === 'available' ? 'rgb(var(--c-border))' : booth.status === 'paid' ? 'rgb(var(--c-primary))' : '#ffc300' }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-primary text-lg leading-none">{booth.boothNumber}</p>
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={booth.status === 'available'
                          ? { background: 'rgb(var(--c-success-bg))', color: 'rgb(var(--c-success))' }
                          : booth.status === 'paid'
                          ? { background: 'rgb(var(--c-primary-soft))', color: 'rgb(var(--c-primary))' }
                          : { background: 'rgb(var(--c-warning-bg))', color: 'rgb(var(--c-warning))' }}
                      >
                        {booth.status}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-ink-subtle">{booth.boothType}</p>
                    <p className="text-xs text-ink-subtle mt-0.5">{booth.zone}</p>
                    <p className="text-xs text-ink-subtle">{booth.size}</p>
                    <p className="text-sm font-semibold text-ink mt-1">₦{booth.price.toLocaleString()}</p>
                    {eventName ? (
                      <p className="text-xs text-ink-subtle mt-1 truncate" title={eventName}>{eventName}</p>
                    ) : (
                      <p className="text-xs font-semibold mt-1" style={{ color: 'rgb(var(--c-danger))' }}>No event assigned</p>
                    )}
                    <button
                      onClick={() => setEditingBooth(booth)}
                      className="inline-flex items-center justify-center gap-2 mt-2 w-full h-8 px-3 text-[13px] rounded-control border border-border-strong bg-surface text-ink font-medium shadow-card transition-colors hover:bg-surface-alt focus-visible:shadow-focus disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Edit
                    </button>
                  </div>
                );
              })}
              {/* Add new booth card */}
              <button
                onClick={() => setShowAddBooth(true)}
                className="rounded-card border-2 border-dashed border-border p-4 flex flex-col items-center justify-center gap-2 text-ink-subtle hover:border-primary hover:text-primary transition-colors min-h-[120px]"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 24 }}>add</span>
                <span className="text-xs font-medium">Add Booth</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* All Bookings tab */}
      {tab === 'bookings' && (
        <div className="bg-surface rounded-card border border-border overflow-hidden">
          {bookingsLoading ? <div className="p-6"><SkeletonCard /></div> : (
            <div className="overflow-x-auto">
              <table className="data-table w-full text-sm">
                <thead>
                  <tr>
                    {['Booth', 'Member', 'Type / Zone', 'Amount', 'Status', 'Payment Ref'].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allBookings.map((b) => {
                    const bsc = bookingStatusConfig[b.status];
                    return (
                      <tr key={b.id} className="hover:bg-surface-alt transition-colors">
                        <td>
                          <p className="font-semibold text-primary">{b.boothNumber}</p>
                          <p className="text-xs text-ink-subtle">{b.size}</p>
                        </td>
                        <td>
                          <p className="font-medium text-ink">{b.memberName ?? '–'}</p>
                          <p className="text-xs text-ink-subtle">{b.memberEmail ?? '–'}</p>
                        </td>
                        <td>
                          <p className="text-ink">{b.boothType}</p>
                          <p className="text-xs text-ink-subtle">{b.zone}</p>
                        </td>
                        <td className="font-semibold text-ink">₦{b.amount.toLocaleString()}</td>
                        <td>
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: bsc.bg, color: bsc.text }}>
                            {bsc.label}
                          </span>
                        </td>
                        <td className="font-mono text-xs text-ink-subtle">{b.paymentRef ?? '–'}</td>
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

export function TradeFairPage() {
  const role = useAppSelector((s) => s.auth.role);
  const isAdmin = role && ADMIN_ROLES.includes(role);
  return isAdmin ? <AdminTradeFairView /> : <MemberTradeFairView />;
}

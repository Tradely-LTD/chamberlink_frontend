import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { Button } from '@shared/ui/Button';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
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
  draft:                { label: 'Draft',                bg: '#e0e3e5', text: '#44474e' },
  open_for_registration: { label: 'Open for Registration', bg: '#a0f4ca', text: '#005137' },
  upcoming:             { label: 'Upcoming',             bg: '#ffdea5', text: '#5d4201' },
  ongoing:              { label: 'Ongoing',              bg: '#a0f4ca', text: '#005137' },
  completed:            { label: 'Completed',            bg: '#e0e3e5', text: '#44474e' },
  cancelled:            { label: 'Cancelled',            bg: '#ffdad6', text: '#93000a' },
};

const bookingStatusConfig: Record<AdminBooking['status'], { label: string; bg: string; text: string }> = {
  reserved:        { label: 'Reserved',        bg: '#a0f4ca', text: '#005137' },
  checked_in:      { label: 'Checked In',      bg: '#d6e3ff', text: '#001b3d' },
  pending_payment: { label: 'Pending Payment', bg: '#ffdea5', text: '#5d4201' },
  cancelled:       { label: 'Cancelled',       bg: '#ffdad6', text: '#93000a' },
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
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#e0e3e5] px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="font-bold text-[#191c1e] text-base">Select a Booth</h2>
            <p className="text-sm text-[#74777f] mt-0.5">{event.title}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#f7f9fb] text-[#74777f]">
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
                    <span className="material-symbols-outlined text-[#74777f]" style={{ fontSize: 16, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 16` }}>location_on</span>
                    <p className="text-xs font-semibold text-[#74777f] uppercase tracking-wide">{zone}</p>
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
                          className={`rounded-xl border p-4 text-left transition-all ${
                            isSelected
                              ? 'border-[#002046] ring-2 ring-[#002046]/20'
                              : isAvailable
                              ? 'border-[#e0e3e5] hover:border-[#002046]/40 bg-white'
                              : 'border-[#e0e3e5] bg-[#f7f9fb] opacity-50 cursor-not-allowed'
                          }`}
                          style={isSelected ? { background: '#f0f4ff' } : {}}
                        >
                          <p className="font-bold text-[#002046] text-base">{booth.boothNumber}</p>
                          <p className="text-xs text-[#74777f] mt-0.5">{booth.boothType}</p>
                          <p className="text-xs text-[#74777f]">{booth.size}</p>
                          <p className="text-sm font-bold text-[#191c1e] mt-2">₦{booth.price.toLocaleString()}</p>
                          {!isAvailable && (
                            <span className="inline-flex items-center mt-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: '#ffdad6', color: '#93000a' }}>Reserved</span>
                          )}
                          {isSelected && (
                            <span className="inline-flex items-center mt-1 rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: '#d6e3ff', color: '#001b3d' }}>Selected</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Summary */}
              {selectedBooth && (
                <div className="rounded-xl border border-[#002046]/20 p-4 mb-6" style={{ background: '#f0f4ff' }}>
                  <p className="text-xs font-semibold text-[#002046] uppercase tracking-wide mb-3">Booking Summary</p>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <span className="text-[#74777f]">Booth</span>
                    <span className="font-semibold text-[#191c1e]">{selectedBooth.boothNumber} — {selectedBooth.boothType}</span>
                    <span className="text-[#74777f]">Zone</span>
                    <span className="text-[#191c1e]">{selectedBooth.zone}</span>
                    <span className="text-[#74777f]">Size</span>
                    <span className="text-[#191c1e]">{selectedBooth.size}</span>
                    <span className="text-[#74777f]">Amount</span>
                    <span className="font-bold text-[#002046] text-base">₦{selectedBooth.price.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-[#74777f] mt-3">You will be redirected to complete payment. Booth is reserved upon payment confirmation.</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose}>Cancel</Button>
                <button
                  disabled={!selected || reserving}
                  onClick={handleReserve}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
                  style={{ background: '#002046' }}
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
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="border-b border-[#e0e3e5] px-6 py-4 flex items-center justify-between">
          <h2 className="font-bold text-[#191c1e]">Add New Booth</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#f7f9fb] text-[#74777f]">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <ErrorBanner message={error} />}

          {/* Event selector */}
          <div>
            <label className="block text-xs font-semibold text-[#44474e] mb-1">Event</label>
            <select
              required
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none"
            >
              <option value="">— Select event —</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title} ({ev.status})</option>
              ))}
            </select>
          </div>

          {[
            { label: 'Booth Number', key: 'boothNumber' as const, placeholder: 'e.g. A-05' },
            { label: 'Zone / Location', key: 'zone' as const, placeholder: 'e.g. Zone A — Textile & Apparel' },
            { label: 'Size', key: 'size' as const, placeholder: 'e.g. 3×3m' },
            { label: 'Price (₦)', key: 'price' as const, placeholder: 'e.g. 150000' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-[#44474e] mb-1">{label}</label>
              <input
                required
                value={form[key]}
                onChange={set(key)}
                placeholder={placeholder}
                className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-[#002046]"
                style={{ '--tw-ring-color': '#002046' } as React.CSSProperties}
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-[#44474e] mb-1">Booth Type</label>
            <select value={form.boothType} onChange={set('boothType')} className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none">
              {['Standard', 'Premium', 'Corner Pavilion', 'Food Court', 'Open Space'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: '#002046' }}
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
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="border-b border-[#e0e3e5] px-6 py-4 flex items-center justify-between">
          <h2 className="font-bold text-[#191c1e]">Create New Event</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#f7f9fb] text-[#74777f]">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <ErrorBanner message={error} />}
          <div>
            <label className="block text-xs font-semibold text-[#44474e] mb-1">Title</label>
            <input
              required
              value={form.title}
              onChange={setField('title')}
              placeholder="e.g. NACCIMA Annual Trade Fair 2026"
              className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-[#002046]"
              style={{ '--tw-ring-color': '#002046' } as React.CSSProperties}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#44474e] mb-1">Venue</label>
            <input
              required
              value={form.venue}
              onChange={setField('venue')}
              placeholder="e.g. Kano Trade Fair Complex, Kano"
              className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-[#002046]"
              style={{ '--tw-ring-color': '#002046' } as React.CSSProperties}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#44474e] mb-1">Start Date</label>
              <input
                required
                type="date"
                value={form.startDate}
                onChange={setField('startDate')}
                className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-[#002046]"
                style={{ '--tw-ring-color': '#002046' } as React.CSSProperties}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#44474e] mb-1">End Date</label>
              <input
                required
                type="date"
                value={form.endDate}
                onChange={setField('endDate')}
                className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-[#002046]"
                style={{ '--tw-ring-color': '#002046' } as React.CSSProperties}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#44474e] mb-1">Registration Deadline <span className="font-normal text-[#74777f]">(optional)</span></label>
            <input
              type="date"
              value={form.registrationDeadline}
              onChange={setField('registrationDeadline')}
              className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-[#002046]"
              style={{ '--tw-ring-color': '#002046' } as React.CSSProperties}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#44474e] mb-1">Description <span className="font-normal text-[#74777f]">(optional)</span></label>
            <textarea
              value={form.description}
              onChange={setField('description')}
              rows={3}
              placeholder="Brief description of the event…"
              className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-[#002046] resize-none"
              style={{ '--tw-ring-color': '#002046' } as React.CSSProperties}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#44474e] mb-1">Host Share (%)</label>
              <input
                required
                type="number"
                min={0}
                max={100}
                value={form.hostSharePct}
                onChange={setField('hostSharePct')}
                className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-[#002046]"
                style={{ '--tw-ring-color': '#002046' } as React.CSSProperties}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#44474e] mb-1">Tradely Share (%)</label>
              <input
                required
                type="number"
                min={0}
                max={100}
                value={form.tradelySharePct}
                onChange={setField('tradelySharePct')}
                className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-[#002046]"
                style={{ '--tw-ring-color': '#002046' } as React.CSSProperties}
              />
            </div>
          </div>
          {shareError && (
            <p className="text-xs font-medium text-[#93000a] bg-[#ffdad6] rounded-lg px-3 py-2">{shareError}</p>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: '#002046' }}
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
  const tenantId = useAppSelector((s) => s.auth.user?.tenantId);
  const { data: events, isLoading } = useGetTradeFairEventsQuery(tenantId ?? skipToken);
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
    <div className="p-6 max-w-4xl">
      {bookingEvent && <BoothBookingModal event={bookingEvent} onClose={() => setBookingEvent(null)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#191c1e]">Trade Fair</h2>
          <p className="text-sm text-[#74777f] mt-0.5">Upcoming events and booth registrations.</p>
        </div>
        <Link to="/dashboard/trade-fair/booths">
          <button className="flex items-center gap-2 rounded-lg border border-[#c4c6cf] bg-white px-4 py-2 text-sm font-medium text-[#191c1e] hover:border-[#002046] hover:text-[#002046] transition-colors">
            <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 16` }}>storefront</span>
            My Booths
          </button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#f7f9fb] rounded-lg p-1 mb-6 w-fit border border-[#e0e3e5]">
        {(['upcoming', 'past'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-white text-[#191c1e] shadow-sm' : 'text-[#74777f] hover:text-[#191c1e]'}`}>
            {t}
          </button>
        ))}
      </div>

      {isLoading && <SkeletonCard />}

      <div className="space-y-4">
        {!isLoading && displayed.length === 0 && (
          <div className="bg-white rounded-xl border border-[#e0e3e5] p-12 text-center">
            <p className="text-sm text-[#74777f]">No {tab} events at this time.</p>
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
            <div key={event.id} className="bg-white rounded-xl border border-[#e0e3e5] overflow-hidden">
              {/* Event header */}
              <div className="px-6 pt-5 pb-4">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div>
                    <h3 className="text-base font-bold text-[#191c1e]">{event.title}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="material-symbols-outlined text-[#74777f]" style={{ fontSize: 14, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 14` }}>location_on</span>
                      <p className="text-sm text-[#74777f]">{event.venue}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold flex-shrink-0" style={{ background: cfg.bg, color: cfg.text }}>
                    {cfg.label}
                  </span>
                </div>

                {event.description && <p className="text-sm text-[#74777f] mb-4">{event.description}</p>}

                {/* Countdown timer */}
                {cd && st !== 'completed' && st !== 'cancelled' && (
                  <div className="flex gap-3 mb-4">
                    {[{ v: cd.days, l: 'Days' }, { v: cd.hours, l: 'Hours' }, { v: cd.mins, l: 'Mins' }].map(({ v, l }) => (
                      <div key={l} className="flex flex-col items-center rounded-lg px-4 py-2.5 min-w-[64px]" style={{ background: '#002046' }}>
                        <span className="text-2xl font-bold text-white leading-none">{String(v).padStart(2, '0')}</span>
                        <span className="text-xs text-[#aec7f7] mt-0.5 font-medium">{l}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Details row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm mb-4">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[#74777f]" style={{ fontSize: 14 }}>calendar_today</span>
                    <span className="text-[#74777f]">{start} — {end}</span>
                  </div>
                  {event.boothsAvailable !== undefined && (
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[#74777f]" style={{ fontSize: 14 }}>storefront</span>
                      <span className="text-[#74777f]">{event.boothsAvailable} booths available</span>
                    </div>
                  )}
                  {deadline && (
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[#74777f]" style={{ fontSize: 14 }}>event_busy</span>
                      <span className="text-[#74777f]">Deadline: {deadline}</span>
                    </div>
                  )}
                </div>

                {st === 'open_for_registration' && (
                  <button
                    onClick={() => setBookingEvent(event)}
                    className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ background: '#002046' }}
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
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="border-b border-[#e0e3e5] px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-[#191c1e]">Edit Booth</h2>
            <p className="text-xs text-[#74777f] mt-0.5">ID: {booth.id}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#f7f9fb] text-[#74777f]">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <ErrorBanner message={error} />}

          <div>
            <label className="block text-xs font-semibold text-[#44474e] mb-1">Event *</label>
            <select required value={form.eventId} onChange={set('eventId')} className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none">
              <option value="">— Select event —</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title} ({ev.status})</option>
              ))}
            </select>
          </div>

          {[
            { label: 'Booth Number', key: 'boothNumber' as const, placeholder: 'e.g. A-05' },
            { label: 'Zone / Location', key: 'zone' as const, placeholder: 'e.g. Zone A' },
            { label: 'Size', key: 'size' as const, placeholder: 'e.g. 3×3m' },
            { label: 'Price (₦)', key: 'price' as const, placeholder: 'e.g. 150000' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-[#44474e] mb-1">{label}</label>
              <input required value={form[key]} onChange={set(key)} placeholder={placeholder}
                className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:border-[#002046]"
                style={{ '--tw-ring-color': '#002046' } as React.CSSProperties} />
            </div>
          ))}

          <div>
            <label className="block text-xs font-semibold text-[#44474e] mb-1">Booth Type</label>
            <select value={form.boothType} onChange={set('boothType')} className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none">
              {['Standard', 'Premium', 'Corner Pavilion', 'Food Court', 'Open Space'].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

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
    <div className="p-6 max-w-6xl">
      {showAddBooth && <AddBoothModal eventId={selectedEventId} events={allEvents} onClose={() => setShowAddBooth(false)} />}
      {showCreateEvent && <CreateEventModal onClose={() => setShowCreateEvent(false)} />}
      {editingBooth && <EditBoothModal booth={editingBooth} events={allEvents} onClose={() => setEditingBooth(null)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#191c1e]">Trade Fair Management</h2>
          <p className="text-sm text-[#74777f] mt-0.5">Manage events, booth inventory, and member bookings.</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none text-[#191c1e]"
          >
            {allEvents.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
          </select>
          <button
            onClick={() => setShowCreateEvent(true)}
            className="flex items-center gap-2 rounded-lg border border-[#002046] px-4 py-2 text-sm font-semibold text-[#002046] hover:bg-[#002046] hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add_circle</span>
            Create Event
          </button>
          <button
            onClick={() => setShowAddBooth(true)}
            disabled={!selectedEventId}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: '#002046' }}
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
        ].map(({ icon, label, value, accent }) => (
          <div key={label} className={`rounded-xl border p-4 ${accent ? 'border-[#002046]' : 'bg-white border-[#e0e3e5]'}`} style={accent ? { background: '#002046' } : {}}>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 18`, color: accent ? '#aec7f7' : '#74777f' }}>{icon}</span>
              <p className={`text-xs font-semibold uppercase tracking-wide ${accent ? 'text-[#aec7f7]' : 'text-[#74777f]'}`}>{label}</p>
            </div>
            <p className={`text-2xl font-bold ${accent ? 'text-white' : 'text-[#191c1e]'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#f7f9fb] rounded-lg p-1 mb-6 w-fit border border-[#e0e3e5]">
        {([['overview', 'Event Info'], ['booths', 'Booth Inventory'], ['bookings', 'All Bookings']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === id ? 'bg-white text-[#191c1e] shadow-sm' : 'text-[#74777f] hover:text-[#191c1e]'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Event Info tab */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {!eventsLoading && allEvents.length === 0 && (
            <div className="bg-white rounded-xl border border-[#e0e3e5] p-12 text-center">
              <p className="text-sm text-[#74777f]">No events found. Create one to get started.</p>
            </div>
          )}
          {allEvents.map((event) => {
            const cfg = statusConfig[event.status];
            const cd = countdown(event.startDate);
            const start = new Date(event.startDate).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' });
            const end = new Date(event.endDate).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' });
            return (
              <div key={event.id} className="bg-white rounded-xl border border-[#e0e3e5] p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-[#191c1e]">{event.title}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-[#74777f]" style={{ fontSize: 14, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 14` }}>location_on</span>
                      <p className="text-sm text-[#74777f]">{event.venue}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold" style={{ background: cfg.bg, color: cfg.text }}>{cfg.label}</span>
                </div>
                {event.description && <p className="text-sm text-[#74777f] mb-4">{event.description}</p>}
                {cd && event.status !== 'completed' && (
                  <div className="flex gap-3 mb-4">
                    {[{ v: cd.days, l: 'Days' }, { v: cd.hours, l: 'Hours' }, { v: cd.mins, l: 'Mins' }].map(({ v, l }) => (
                      <div key={l} className="flex flex-col items-center rounded-lg px-4 py-2.5" style={{ background: '#002046' }}>
                        <span className="text-xl font-bold text-white leading-none">{String(v).padStart(2, '0')}</span>
                        <span className="text-xs text-[#aec7f7] mt-0.5">{l}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                  <div><span className="text-[#74777f]">Date: </span><span className="text-[#191c1e] font-medium">{start} — {end}</span></div>
                  {event.boothsAvailable !== undefined && (
                    <div><span className="text-[#74777f]">Booths: </span><span className="text-[#191c1e] font-medium">{event.boothsAvailable} available</span></div>
                  )}
                </div>

                {/* Status transition controls */}
                {STATUS_NEXT[event.status] && (
                  <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-[#f0f2f4]">
                    <span className="text-xs text-[#74777f] font-medium">Change status:</span>
                    {STATUS_NEXT[event.status]!.map((next) => {
                      const isCancel = next.value === 'cancelled';
                      const isLoading = statusChanging === event.id;
                      return (
                        <button
                          key={next.value}
                          disabled={isLoading}
                          onClick={() => handleStatusChange(event.id, next.value)}
                          className="rounded-lg px-3 py-1 text-xs font-semibold border transition-colors disabled:opacity-50"
                          style={isCancel
                            ? { borderColor: '#93000a', color: '#93000a', background: 'transparent' }
                            : { borderColor: '#002046', color: '#002046', background: 'transparent' }}
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
            <div className="flex gap-1 bg-[#f7f9fb] rounded-lg p-1 border border-[#e0e3e5]">
              {(['all', 'available', 'reserved'] as const).map((f) => (
                <button key={f} onClick={() => setBoothFilter(f)} className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${boothFilter === f ? 'bg-white shadow-sm text-[#191c1e]' : 'text-[#74777f]'}`}>
                  {f}
                </button>
              ))}
            </div>
            <p className="text-sm text-[#74777f]">{filteredBooths.length} booths</p>
          </div>

          {boothsLoading ? <SkeletonCard /> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {filteredBooths.map((booth) => {
                const eventName = allEvents.find((e) => e.id === booth.eventId)?.title;
                return (
                  <div
                    key={booth.id}
                    className="bg-white rounded-xl border p-4"
                    style={{ borderColor: booth.status === 'available' ? '#e0e3e5' : booth.status === 'paid' ? '#002046' : '#ffc300' }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-bold text-[#002046] text-lg leading-none">{booth.boothNumber}</p>
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={booth.status === 'available'
                          ? { background: '#a0f4ca', color: '#005137' }
                          : booth.status === 'paid'
                          ? { background: '#d6e3ff', color: '#001b3d' }
                          : { background: '#ffdea5', color: '#5d4201' }}
                      >
                        {booth.status}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-[#44474e]">{booth.boothType}</p>
                    <p className="text-xs text-[#74777f] mt-0.5">{booth.zone}</p>
                    <p className="text-xs text-[#74777f]">{booth.size}</p>
                    <p className="text-sm font-bold text-[#191c1e] mt-1">₦{booth.price.toLocaleString()}</p>
                    {eventName ? (
                      <p className="text-xs text-[#74777f] mt-1 truncate" title={eventName}>{eventName}</p>
                    ) : (
                      <p className="text-xs font-semibold mt-1" style={{ color: '#93000a' }}>No event assigned</p>
                    )}
                    <button
                      onClick={() => setEditingBooth(booth)}
                      className="mt-2 w-full rounded-lg border border-[#c4c6cf] px-2 py-1 text-xs font-semibold text-[#74777f] hover:border-[#002046] hover:text-[#002046] transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                );
              })}
              {/* Add new booth card */}
              <button
                onClick={() => setShowAddBooth(true)}
                className="rounded-xl border-2 border-dashed border-[#c4c6cf] p-4 flex flex-col items-center justify-center gap-2 text-[#74777f] hover:border-[#002046] hover:text-[#002046] transition-colors min-h-[120px]"
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
        <div className="bg-white rounded-xl border border-[#e0e3e5] overflow-hidden">
          {bookingsLoading ? <div className="p-6"><SkeletonCard /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f7f9fb] border-b border-[#e0e3e5]">
                    {['Booth', 'Member', 'Type / Zone', 'Amount', 'Status', 'Payment Ref'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#74777f] uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f2f4]">
                  {allBookings.map((b) => {
                    const bsc = bookingStatusConfig[b.status];
                    return (
                      <tr key={b.id} className="hover:bg-[#f7f9fb] transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-bold text-[#002046]">{b.boothNumber}</p>
                          <p className="text-xs text-[#74777f]">{b.size}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-[#191c1e]">{b.memberName ?? '—'}</p>
                          <p className="text-xs text-[#74777f]">{b.memberEmail ?? '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-[#191c1e]">{b.boothType}</p>
                          <p className="text-xs text-[#74777f]">{b.zone}</p>
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#191c1e]">₦{b.amount.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: bsc.bg, color: bsc.text }}>
                            {bsc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[#74777f]">{b.paymentRef ?? '—'}</td>
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

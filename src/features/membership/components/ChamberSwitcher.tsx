import { useEffect, useRef, useState } from 'react';
import { useAppSelector } from '@shared/hooks/useAppDispatch';
import {
  useGetMyConnectionsQuery,
  useSwitchActiveChamberMutation,
} from '../connectionsApi';
import { ConnectChamberModal } from './ConnectChamberModal';
import { Toast } from '@shared/ui/Toast';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  pending_payment: 'bg-yellow-100 text-yellow-800',
  expired: 'bg-red-100 text-red-800',
  suspended: 'bg-gray-100 text-gray-700',
};

const statusLabels: Record<string, string> = {
  active: 'Active',
  pending_payment: 'Pending Payment',
  expired: 'Expired',
  suspended: 'Suspended',
};

/**
 * Slack/Notion-style chamber switcher — shows the active chamber, lets the
 * user pick a different one from their connections, and offers a "Connect a
 * new chamber" CTA. A user with zero connections sees the CTA only — never an
 * error or blocked state.
 */
export function ChamberSwitcher() {
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeTenantId = useAppSelector((s) => s.auth.user?.activeTenantId);
  const { data: connections, isLoading } = useGetMyConnectionsQuery();
  const [switchActiveChamber, { isLoading: isSwitching }] = useSwitchActiveChamberMutation();
  const [switchingTenantId, setSwitchingTenantId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const activeConnection = connections?.find((c) => c.tenantId === activeTenantId) ?? null;

  const handleSwitch = async (tenantId: string) => {
    if (tenantId === activeTenantId) {
      setOpen(false);
      return;
    }
    setSwitchingTenantId(tenantId);
    try {
      await switchActiveChamber({ tenantId }).unwrap();
      setOpen(false);
    } catch (err: unknown) {
      const message =
        (err as { data?: { message?: string } })?.data?.message ??
        'Could not switch chamber. Please try again.';
      setToast({ message, type: 'error' });
    } finally {
      setSwitchingTenantId(null);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-ink hover:bg-surface-alt transition-colors"
        title="Switch chamber"
      >
        {activeConnection?.tenantLogoUrl ? (
          <img
            src={activeConnection.tenantLogoUrl}
            alt=""
            className="h-6 w-6 rounded-full object-contain border border-border bg-white flex-shrink-0"
          />
        ) : (
          <span
            className="material-symbols-outlined flex-shrink-0 text-ink-subtle"
            style={{ fontSize: 20, fontVariationSettings: `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20` }}
          >
            corporate_fare
          </span>
        )}
        <span className="max-w-[140px] truncate hidden sm:inline">
          {isLoading ? 'Loading…' : (activeConnection?.tenantName ?? 'No chamber selected')}
        </span>
        <span
          className="material-symbols-outlined text-ink-subtle"
          style={{ fontSize: 18, fontVariationSettings: `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 18` }}
        >
          expand_more
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-border bg-white shadow-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Your Chambers</p>
          </div>

          {isLoading ? (
            <div className="px-4 py-4 text-sm text-ink-subtle">Loading connections…</div>
          ) : connections && connections.length > 0 ? (
            <ul className="max-h-72 overflow-y-auto py-1">
              {connections.map((c) => (
                <li key={c.tenantId}>
                  <button
                    onClick={() => handleSwitch(c.tenantId)}
                    disabled={isSwitching && switchingTenantId === c.tenantId}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-surface-alt transition-colors disabled:opacity-60 ${
                      c.isActive ? 'bg-[#eef3ff]' : ''
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      {c.isActive && (
                        <span
                          className="material-symbols-outlined text-primary flex-shrink-0"
                          style={{ fontSize: 18, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 18` }}
                        >
                          check_circle
                        </span>
                      )}
                      <span className="truncate">
                        <span className="block truncate font-medium text-ink">{c.tenantName}</span>
                        <span className="block truncate text-xs text-ink-subtle">{c.tierName}</span>
                      </span>
                    </span>
                    <span
                      className={`flex-shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        statusColors[c.status] ?? 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {statusLabels[c.status] ?? c.status}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-4 text-sm text-ink-subtle">
              You&apos;re not connected to a chamber yet.
            </div>
          )}

          <div className="border-t border-border p-2">
            <button
              onClick={() => {
                setOpen(false);
                setModalOpen(true);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-[#eef3ff] transition-colors"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 18, fontVariationSettings: `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 18` }}
              >
                add_circle
              </span>
              Connect a new chamber
            </button>
          </div>
        </div>
      )}

      {modalOpen && (
        <ConnectChamberModal
          onClose={() => setModalOpen(false)}
          onConnected={(message) => setToast({ message, type: 'success' })}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

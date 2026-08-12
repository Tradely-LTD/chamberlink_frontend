import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useGetMyConnectionsQuery,
  useSwitchActiveChamberMutation,
  useRemoveConnectionMutation,
} from '@features/membership/connectionsApi';
import { ConnectChamberModal } from '@features/membership/components/ConnectChamberModal';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { EmptyState } from '@shared/ui/EmptyState';
import { Button } from '@shared/ui/Button';
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

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-NG', {
    timeZone: 'Africa/Lagos',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Full connection list (AC8) — view/manage every chamber this ChamberLink
 * identity is connected to, each with its own independent status/tier/dues.
 */
export function MyConnectionsPage() {
  const navigate = useNavigate();
  const { data: connections, isLoading, isError, refetch } = useGetMyConnectionsQuery();
  const [switchActiveChamber, { isLoading: isSwitching }] = useSwitchActiveChamberMutation();
  const [removeConnection, { isLoading: isRemoving }] = useRemoveConnectionMutation();

  const [busyTenantId, setBusyTenantId] = useState<string | null>(null);
  const [confirmingTenantId, setConfirmingTenantId] = useState<string | null>(null);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSwitch = async (tenantId: string) => {
    setBusyTenantId(tenantId);
    try {
      await switchActiveChamber({ tenantId }).unwrap();
      setToast({ message: 'Switched active chamber.', type: 'success' });
    } catch {
      setToast({ message: 'Could not switch chamber. Please try again.', type: 'error' });
    } finally {
      setBusyTenantId(null);
    }
  };

  const handleSwitchAndPay = async (tenantId: string) => {
    await handleSwitch(tenantId);
    navigate('/dashboard/membership');
  };

  const handleDisconnect = async (tenantId: string) => {
    setBusyTenantId(tenantId);
    try {
      await removeConnection({ tenantId }).unwrap();
      setToast({ message: 'Disconnected from chamber.', type: 'success' });
    } catch {
      setToast({ message: 'Could not disconnect. Please try again.', type: 'error' });
    } finally {
      setBusyTenantId(null);
      setConfirmingTenantId(null);
    }
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#221a0f] mb-1">My Chambers</h1>
          <p className="text-sm text-[#8A7E6E]">
            Every chamber your ChamberLink identity is connected to — each with its own status, tier, and dues.
          </p>
        </div>
        <Button onClick={() => setConnectModalOpen(true)} className="flex-shrink-0">
          Connect a chamber
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <SkeletonCard className="h-24" />
          <SkeletonCard className="h-24" />
        </div>
      )}

      {isError && !isLoading && (
        <div className="space-y-3">
          <ErrorBanner message="Failed to load your chamber connections." />
          <Button variant="outline" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      {!isLoading && !isError && (connections ?? []).length === 0 && (
        <EmptyState
          icon="corporate_fare"
          title="You're not connected to any chamber yet"
          message="Connect to a chamber to access membership benefits, pay dues, and apply for services like eCO certificates."
          action={<Button onClick={() => setConnectModalOpen(true)}>Connect a chamber</Button>}
        />
      )}

      {!isLoading && !isError && (connections ?? []).length > 0 && (
        <ul className="space-y-3">
          {(connections ?? []).map((c) => {
            const isBusy = busyTenantId === c.tenantId && (isSwitching || isRemoving);
            const needsAttention = c.status === 'pending_payment' || c.status === 'expired';
            return (
              <li key={c.tenantId} className="bg-white rounded-xl border border-[#bec9bf]/40 overflow-hidden">
                <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4">
                  <div className="flex items-center gap-3 min-w-0">
                    {c.tenantLogoUrl ? (
                      <img
                        src={c.tenantLogoUrl}
                        alt=""
                        className="h-10 w-10 rounded-lg object-contain border border-[#bec9bf]/40 bg-white flex-shrink-0"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-lg bg-[#f7f9f7] border border-[#bec9bf]/40 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-[#8A7E6E]" style={{ fontSize: 20 }}>
                          corporate_fare
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-[#221a0f] truncate flex items-center gap-2">
                        {c.tenantName}
                        {c.isActive && (
                          <span className="inline-flex items-center rounded-full bg-[#d6e3ff] px-2 py-0.5 text-[11px] font-medium text-[#023293]">
                            Active workspace
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-[#8A7E6E] truncate">
                        {c.tierName} · Member ID: {c.memberId}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`flex-shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[c.status] ?? 'bg-gray-100 text-gray-700'}`}
                  >
                    {statusLabels[c.status] ?? c.status}
                  </span>
                </div>

                <dl className="grid grid-cols-2 gap-4 px-6 py-3 border-t border-[#bec9bf]/30 text-sm">
                  <div>
                    <dt className="text-xs text-[#8A7E6E]">Member Since</dt>
                    <dd className="text-[#221a0f]">{formatDate(c.memberSince)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[#8A7E6E]">Expires</dt>
                    <dd className="text-[#221a0f]">{formatDate(c.expiresAt)}</dd>
                  </div>
                </dl>

                <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-t border-[#bec9bf]/30">
                  {!c.isActive && (
                    <Button
                      variant="outline"
                      loading={isBusy && busyTenantId === c.tenantId && isSwitching}
                      onClick={() => handleSwitch(c.tenantId)}
                    >
                      Switch to this chamber
                    </Button>
                  )}
                  {needsAttention && (
                    <Button
                      loading={isBusy && isSwitching}
                      onClick={() => handleSwitchAndPay(c.tenantId)}
                    >
                      {c.status === 'expired' ? 'Renew Membership' : 'Complete Payment'}
                    </Button>
                  )}
                  {confirmingTenantId === c.tenantId ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#8A7E6E]">Disconnect from {c.tenantName}?</span>
                      <Button
                        variant="outline"
                        className="border-red-300 text-red-700 hover:border-red-500"
                        loading={isBusy && isRemoving}
                        onClick={() => handleDisconnect(c.tenantId)}
                      >
                        Confirm
                      </Button>
                      <Button variant="outline" onClick={() => setConfirmingTenantId(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingTenantId(c.tenantId)}
                      className="ml-auto text-xs font-medium text-red-600 hover:underline"
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {connectModalOpen && (
        <ConnectChamberModal
          onClose={() => setConnectModalOpen(false)}
          onConnected={(message) => setToast({ message, type: 'success' })}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

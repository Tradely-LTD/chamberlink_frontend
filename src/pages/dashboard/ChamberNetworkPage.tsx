import { useState } from 'react';
import { useGetOnboardedChambersQuery, useGetMyConnectionsQuery } from '@features/membership/connectionsApi';
import { useConnectToChamber } from '@features/membership/hooks/useConnectToChamber';
import { ConnectViaRosterModal } from '@features/membership/components/ConnectViaRosterModal';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { EmptyState } from '@shared/ui/EmptyState';
import { Button } from '@shared/ui/Button';
import { Toast } from '@shared/ui/Toast';

/**
 * Chamber Network — discover onboarded chambers this ChamberLink identity is
 * NOT yet connected to. Each card offers two independent actions:
 *  - "Connect with existing ID" (ConnectViaRosterModal) — for members who
 *    were part of that chamber before ChamberLink existed.
 *  - "Register" (useConnectToChamber, same mint-new-membership flow
 *    ConnectChamberModal's generic picker uses) — for anyone with no prior
 *    ID at that chamber. Both always show together; the user self-selects.
 *
 * Member-only nav item by design — staff_operator accounts don't hold
 * memberships, they're added directly by their chamber's admin.
 */
export function ChamberNetworkPage() {
  const {
    data: chambers,
    isLoading: isLoadingChambers,
    isError: isChambersError,
    refetch: refetchChambers,
  } = useGetOnboardedChambersQuery();
  const {
    data: connections,
    isLoading: isLoadingConnections,
    isError: isConnectionsError,
    refetch: refetchConnections,
  } = useGetMyConnectionsQuery();

  const [activeModalTenant, setActiveModalTenant] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const { connect, isConnecting, pendingTenantId, inlineError } = useConnectToChamber((message) =>
    setToast({ message, type: 'success' })
  );

  const isLoading = isLoadingChambers || isLoadingConnections;
  const isError = isChambersError || isConnectionsError;

  const connectedTenantIds = new Set((connections ?? []).map((c) => c.tenantId));
  const availableChambers = (chambers ?? []).filter((chamber) => !connectedTenantIds.has(chamber.id));

  const handleRetry = () => {
    if (isChambersError) refetchChambers();
    if (isConnectionsError) refetchConnections();
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink mb-1">Chamber Network</h1>
        <p className="text-sm text-ink-subtle">
          Already a member of one of these chambers? Connect with your existing member ID to link your records.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          <SkeletonCard className="h-20" />
          <SkeletonCard className="h-20" />
        </div>
      )}

      {isError && !isLoading && (
        <div className="space-y-3">
          <ErrorBanner message="Failed to load the chamber network." />
          <Button variant="outline" onClick={handleRetry}>Retry</Button>
        </div>
      )}

      {!isLoading && !isError && availableChambers.length === 0 && (
        <EmptyState
          icon="travel_explore"
          title="You're connected to every onboarded chamber"
          message="There's no other chamber left to connect to right now — check back as more chambers onboard."
        />
      )}

      {!isLoading && !isError && availableChambers.length > 0 && (
        <ul className="space-y-3">
          {availableChambers.map((chamber) => (
            <li
              key={chamber.id}
              className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-xl border border-border/40 px-6 py-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                {chamber.logoUrl ? (
                  <img
                    src={chamber.logoUrl}
                    alt=""
                    className="h-11 w-11 rounded-lg object-contain border border-border/40 bg-white flex-shrink-0"
                  />
                ) : (
                  <div className="h-11 w-11 rounded-lg bg-surface-alt border border-border/40 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-ink-subtle" style={{ fontSize: 22 }}>
                      corporate_fare
                    </span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-medium text-ink truncate">{chamber.name}</p>
                  {chamber.city && <p className="text-xs text-ink-subtle truncate">{chamber.city}</p>}
                  {inlineError?.tenantId === chamber.id && (
                    <p className="mt-1 text-xs text-red-600">{inlineError.message}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={() => setActiveModalTenant({ id: chamber.id, name: chamber.name })}
                >
                  Connect with existing ID
                </Button>
                <Button
                  loading={isConnecting && pendingTenantId === chamber.id}
                  disabled={isConnecting && pendingTenantId !== chamber.id}
                  onClick={() => connect(chamber.id)}
                >
                  Register
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {activeModalTenant && (
        <ConnectViaRosterModal
          tenantId={activeModalTenant.id}
          tenantName={activeModalTenant.name}
          onClose={() => setActiveModalTenant(null)}
          onConnected={(message) => setToast({ message, type: 'success' })}
        />
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

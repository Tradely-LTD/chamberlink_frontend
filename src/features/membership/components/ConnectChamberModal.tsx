import { useGetOnboardedChambersQuery } from '../connectionsApi';
import { useConnectToChamber } from '../hooks/useConnectToChamber';
import { Button } from '@shared/ui/Button';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { Spinner } from '@shared/ui/Spinner';

interface Props {
  onClose: () => void;
  /** Called with a human-readable success message once a connection is made. */
  onConnected: (message: string) => void;
}

/**
 * "Connect a new chamber" picker. Handles all four backend response states
 * distinctly (via useConnectToChamber, shared with ChamberNetworkPage's
 * per-card Register button):
 *  - 201 created    → success message + switch the workspace to it
 *  - 200 noop        → "you're already connected"
 *  - 200 reactivated → "welcome back" (connection reactivated, dues owing)
 *  - 409 suspended   → clear explanation, no retry loop
 */
export function ConnectChamberModal({ onClose, onConnected }: Props) {
  const { data: chambers, isLoading, isError, refetch } = useGetOnboardedChambersQuery();
  const { connect, isConnecting, pendingTenantId, inlineError } = useConnectToChamber((message) => {
    onConnected(message);
    onClose();
  });
  const handleConnect = connect;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-ink">Connect a new chamber</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-subtle hover:bg-surface-alt transition-colors"
            aria-label="Close"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 20, fontVariationSettings: `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20` }}
            >
              close
            </span>
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto px-5 py-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Spinner size="md" />
            </div>
          )}

          {isError && (
            <div className="space-y-3">
              <ErrorBanner message="Could not load the list of chambers. Please try again." />
              <Button variant="outline" onClick={() => refetch()} className="w-full">
                Retry
              </Button>
            </div>
          )}

          {!isLoading && !isError && (chambers ?? []).length === 0 && (
            <p className="py-6 text-center text-sm text-ink-subtle">
              No chambers are available to connect to right now.
            </p>
          )}

          {!isLoading && !isError && (chambers ?? []).length > 0 && (
            <ul className="divide-y divide-border">
              {(chambers ?? []).map((chamber) => (
                <li key={chamber.id} className="py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">{chamber.name}</p>
                      {chamber.city && <p className="truncate text-xs text-ink-subtle">{chamber.city}</p>}
                    </div>
                    <Button
                      variant="outline"
                      loading={isConnecting && pendingTenantId === chamber.id}
                      disabled={isConnecting && pendingTenantId !== chamber.id}
                      onClick={() => handleConnect(chamber.id)}
                    >
                      Connect
                    </Button>
                  </div>
                  {inlineError?.tenantId === chamber.id && (
                    <p className="mt-2 text-xs text-red-600">{inlineError.message}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useConnectToChamberMutation, useSwitchActiveChamberMutation } from '../connectionsApi';

/**
 * Shared "mint a brand-new membership" flow — the exact created/noop/
 * reactivated/409/404 branching used to live only inside ConnectChamberModal.
 * Extracted so ChamberNetworkPage's per-card "Register" button and
 * ConnectChamberModal's generic picker both call the SAME code (single
 * source of truth for outcome-state handling), not two copies.
 */
export function useConnectToChamber(onSuccess: (message: string) => void) {
  const [connectToChamber, { isLoading }] = useConnectToChamberMutation();
  const [switchActiveChamber] = useSwitchActiveChamberMutation();
  const [pendingTenantId, setPendingTenantId] = useState<string | null>(null);
  const [inlineError, setInlineError] = useState<{ tenantId: string; message: string } | null>(null);

  const connect = async (tenantId: string) => {
    setInlineError(null);
    setPendingTenantId(tenantId);
    try {
      const { action } = await connectToChamber({ tenantId }).unwrap();

      if (action === 'created') {
        // A brand-new connection — take the user straight into that workspace.
        try {
          await switchActiveChamber({ tenantId }).unwrap();
        } catch {
          // Non-fatal — the connection was created either way; the user can
          // switch manually from the chamber switcher.
        }
        onSuccess('Connected! Welcome to your new chamber.');
      } else if (action === 'noop') {
        onSuccess("You're already connected to this chamber.");
      } else {
        // reactivated
        onSuccess('Welcome back — your connection has been reactivated.');
      }
    } catch (err: unknown) {
      const e = err as { status?: number; data?: { message?: string } };
      if (e.status === 409) {
        setInlineError({
          tenantId,
          message: e.data?.message ?? 'Your connection to this chamber is suspended — contact the chamber admin.',
        });
      } else if (e.status === 404) {
        setInlineError({ tenantId, message: 'This chamber is unavailable right now.' });
      } else {
        setInlineError({ tenantId, message: 'Something went wrong. Please try again.' });
      }
    } finally {
      setPendingTenantId(null);
    }
  };

  return { connect, isConnecting: isLoading, pendingTenantId, inlineError };
}

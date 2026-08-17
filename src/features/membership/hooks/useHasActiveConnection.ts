import { useGetMyConnectionsQuery } from '../connectionsApi';

/**
 * Stricter than useHasChamberConnection: true only when at least one
 * connection has status==='active' (dues paid) — pending_payment/suspended/
 * expired do not count. Mirrors the backend's requireActiveMembership
 * middleware (chamberlink_backend/src/middlewares/requireActiveMembership.ts)
 * exactly, including its scope: ANY of the member's connections, not just
 * the currently-selected activeTenantId one.
 *
 * Used to gate the *entry point* of an action that requireActiveMembership
 * will reject server-side (creating an exporter profile, generating an
 * export document, following a trade corridor) — showing the "you need paid
 * membership" message BEFORE the member invests time filling out a form,
 * not only after they submit it.
 */
export function useHasActiveConnection() {
  const { data: connections, isLoading } = useGetMyConnectionsQuery();
  return { hasActiveConnection: (connections ?? []).some((c) => c.status === 'active'), isLoading };
}

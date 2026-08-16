import { useGetMyConnectionsQuery } from '../connectionsApi';

/**
 * "≥1 chamber connection, in ANY status (active/pending_payment/suspended/
 * expired all count)" — the gate used to hide/route-guard chamber-scoped
 * modules for a brand-new member. Deliberately NOT based on activeTenantId:
 * a user can have a real connection that just isn't the currently-selected
 * workspace (e.g. right after disconnecting their only OTHER chamber).
 *
 * Reads the same zero-arg useGetMyConnectionsQuery() cache entry that
 * ChamberSwitcher (rendered in DashboardShell's header on every dashboard
 * page) already keeps warm — calling it again here is a cache hit, not an
 * extra network request.
 */
export function useHasChamberConnection() {
  const { data: connections, isLoading } = useGetMyConnectionsQuery();
  return { hasConnection: (connections ?? []).length > 0, isLoading };
}

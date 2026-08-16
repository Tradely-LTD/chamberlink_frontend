import { Navigate, Outlet } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAppSelector } from '@shared/hooks/useAppDispatch';
import { useHasChamberConnection } from '@features/membership';
import { Spinner } from '@shared/ui/Spinner';

interface Props {
  children?: ReactNode;
}

/**
 * Route-level twin of Sidebar's GATED_LABELS filter — blocks direct URL
 * navigation (bookmark/typed-URL/back-button) to a chamber-scoped module for
 * a `member` with ZERO chamber connections, redirecting to Chamber Network
 * instead of letting the page mount and 403 on its own data fetch.
 *
 * Scoped to role === 'member' only, mirroring the backend's
 * requireChamberConnection middleware exactly — these routes are "shared"
 * (reachable by institutional_subscriber/staff_operator/chamber_admin/etc.
 * too, per router.tsx), and only members hold member_profiles rows at all.
 *
 * Deliberately does NOT redirect while the connections query is still
 * loading (would flash-redirect every user on login before the fetch
 * resolves) — renders a spinner and waits.
 */
export function RequireChamberConnection({ children }: Props) {
  const role = useAppSelector((s) => s.auth.role);
  const { hasConnection, isLoading } = useHasChamberConnection();
  const content = children ? <>{children}</> : <Outlet />;

  if (role !== 'member') {
    return content;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <Spinner size="md" />
      </div>
    );
  }

  if (!hasConnection) {
    return <Navigate to="/dashboard/chamber-network" replace />;
  }

  return content;
}

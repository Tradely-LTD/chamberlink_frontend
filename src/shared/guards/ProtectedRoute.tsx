import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppSelector } from '@shared/hooks/useAppDispatch';
import type { Role } from '@entities/user/types';
import type { ReactNode } from 'react';

interface Props {
  allowedRoles?: Role[];
  children?: ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: Props) {
  const { isAuthenticated, role } = useAppSelector((s) => s.auth);
  const location = useLocation();

  if (!isAuthenticated) {
    const redirectTo = location.pathname + location.search;
    return <Navigate to={`/login?redirectTo=${encodeURIComponent(redirectTo)}`} replace />;
  }
  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

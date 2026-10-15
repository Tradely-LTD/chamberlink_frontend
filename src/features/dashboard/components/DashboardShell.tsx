import { Link, Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useAppSelector } from '@shared/hooks/useAppDispatch';
import { ChamberSwitcher } from '@features/membership/components/ChamberSwitcher';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/profile': 'My Profile',
  '/dashboard/connections': 'My Chambers',
  '/dashboard/chamber-network': 'Chamber Network',
  '/dashboard/membership': 'Membership',
  '/dashboard/eco': 'Certificate Applications',
  '/dashboard/eco/apply': 'New Certificate Application',
  '/dashboard/documents': 'Documents',
  '/dashboard/trade-fair': 'Trade Fair',
  '/dashboard/trade-fair/booths': 'My Booths',
  '/dashboard/academy': 'E-Learning',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/admin': 'Audit Log',
  '/dashboard/trade-corridors': 'Trade Corridors',
  '/dashboard/exporter-visibility': 'Exporter Visibility',
  '/dashboard/export-documents': 'Export Documents',
  '/dashboard/bank-verification': 'Bank & FI Verification',
  '/dashboard/trade-data-api': 'Trade Data API',
  '/dashboard/members': 'Member Management',
  '/dashboard/white-label': 'White-Label Console',
  '/dashboard/settings': 'Platform Settings',
};

export function DashboardShell() {
  const location = useLocation();
  const user = useAppSelector((s) => s.auth.user);
  const pageTitle = pageTitles[location.pathname] ?? 'Dashboard';

  return (
    <div className="flex h-screen bg-canvas">
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile nav */}
        <MobileNav />

        {/* Top bar — context and account only. The page itself owns its one
            title (see shared/ui/PageHeader), so it is not repeated here. */}
        <header className="hidden md:flex h-16 flex-shrink-0 items-center justify-between gap-4 border-b border-border bg-surface/80 px-8 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
          <p className="text-[13px] text-ink-subtle truncate">
            <span className="sr-only">Current page: </span>{pageTitle}
          </p>
          <div className="flex items-center gap-2">
            <ChamberSwitcher />
            {user && (
              <Link
                to="/dashboard/profile"
                title="My profile"
                className="ml-1 flex items-center gap-2.5 rounded-control border-l border-border pl-4 pr-2 py-1.5 transition-colors hover:bg-surface-alt"
              >
                <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 bg-primary-soft text-primary">
                  {[user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join('').toUpperCase() || user.email[0].toUpperCase()}
                </div>
                <span className="text-[13px] font-medium text-ink">
                  {user.firstName ?? user.email.split('@')[0]}
                </span>
              </Link>
            )}
          </div>
        </header>

        {/* Page content */}
        <main id="main" className="flex-1 overflow-y-auto">
          <div key={location.pathname} className="animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

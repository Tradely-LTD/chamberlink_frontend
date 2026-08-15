import { Link, Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { useAppSelector } from '@shared/hooks/useAppDispatch';
import { ChamberSwitcher } from '@features/membership/components/ChamberSwitcher';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/profile': 'My Profile',
  '/dashboard/connections': 'My Chambers',
  '/dashboard/membership': 'Membership',
  '/dashboard/eco': 'eCO Certificates',
  '/dashboard/eco/apply': 'New eCO Application',
  '/dashboard/documents': 'Documents',
  '/dashboard/trade-fair': 'Trade Fair',
  '/dashboard/trade-fair/booths': 'My Booths',
  '/dashboard/academy': 'Academy',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/admin': 'Audit Log',
  '/dashboard/trade-corridors': 'Trade Corridors',
  '/dashboard/exporter-visibility': 'Exporter Visibility',
  '/dashboard/export-documents': 'Export Documents',
  '/dashboard/bank-verification': 'Bank & FI Verification',
  '/dashboard/trade-data-api': 'Trade Data API',
  '/dashboard/members': 'Member Management',
  '/dashboard/white-label': 'White-Label Console',
};

export function DashboardShell() {
  const location = useLocation();
  const user = useAppSelector((s) => s.auth.user);
  const pageTitle = pageTitles[location.pathname] ?? 'Dashboard';

  return (
    <div className="flex h-screen" style={{ background: '#f7f9fb' }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile nav */}
        <MobileNav />

        {/* Top header bar */}
        <header className="hidden md:flex items-center justify-between px-6 h-14 bg-white border-b border-[#e0e3e5] flex-shrink-0">
          <h1 className="text-base font-semibold text-[#191c1e]">{pageTitle}</h1>
          <div className="flex items-center gap-2">
            <ChamberSwitcher />
            <button
              className="p-2 rounded-lg text-[#74777f] hover:bg-[#eceef0] transition-colors"
              title="Notifications"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20` }}>
                notifications
              </span>
            </button>
            <button
              className="p-2 rounded-lg text-[#74777f] hover:bg-[#eceef0] transition-colors"
              title="Help"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20` }}>
                help_outline
              </span>
            </button>
            {user && (
              <Link
                to="/dashboard/profile"
                title="My Profile"
                className="ml-1 flex items-center gap-2 pl-3 border-l border-[#e0e3e5] rounded-lg hover:bg-[#eceef0] transition-colors py-1 pr-2"
              >
                <div
                  className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: '#d6e3ff', color: '#023293' }}
                >
                  {[user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join('').toUpperCase() || user.email[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium text-[#191c1e]">
                  {user.firstName ?? user.email.split('@')[0]}
                </span>
              </Link>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@shared/hooks/useAppDispatch';
import { logout } from '@features/auth/authSlice';
import { tokenStorage } from '@shared/utils/tokenStorage';
import { returnOrigin } from '@shared/utils/returnOrigin';
import { useLogoutUserMutation } from '@features/auth/authApi';
import { useGetMyTenantQuery } from '@features/white-label';
import { useHasChamberConnection } from '@features/membership';
import { emptyApi } from '@shared/api/emptyApi';
import type { Role } from '@entities/user/types';

interface NavItem {
  label: string;
  to: string;
  icon: string;
  end?: boolean;
}

// member + patron (same nav — tier only affects what they can afford, not what they can see)
const memberNavItems: NavItem[] = [
  { label: 'Dashboard',           to: '/dashboard',                     icon: 'dashboard',       end: true },
  { label: 'Trade Fair',          to: '/dashboard/trade-fair',          icon: 'storefront' },
  { label: 'Academy',             to: '/dashboard/academy',             icon: 'school' },
  { label: 'eCO Certificates',    to: '/dashboard/eco',                 icon: 'description' },
  { label: 'Export Documents',    to: '/dashboard/export-documents',    icon: 'receipt_long' },
  { label: 'Membership',          to: '/dashboard/membership',          icon: 'verified_user' },
  { label: 'Trade Corridors',     to: '/dashboard/trade-corridors',     icon: 'route' },
  { label: 'Exporter Visibility', to: '/dashboard/exporter-visibility', icon: 'visibility' },
  { label: 'My Chambers',         to: '/dashboard/connections',         icon: 'corporate_fare' },
  { label: 'Chamber Network',     to: '/dashboard/chamber-network',     icon: 'travel_explore' },
  { label: 'My Profile',          to: '/dashboard/profile',             icon: 'manage_accounts' },
];

// institutional_subscriber: verify exporters, access trade data — no membership/trade-fair/docs
const institutionalNavItems: NavItem[] = [
  { label: 'Dashboard',           to: '/dashboard',                     icon: 'dashboard',       end: true },
  { label: 'Bank Verification',   to: '/dashboard/bank-verification',   icon: 'verified' },
  { label: 'Exporter Visibility', to: '/dashboard/exporter-visibility', icon: 'visibility' },
  { label: 'Trade Corridors',     to: '/dashboard/trade-corridors',     icon: 'route' },
  { label: 'Trade Data API',      to: '/dashboard/trade-data-api',      icon: 'api' },
  { label: 'My Chambers',         to: '/dashboard/connections',         icon: 'corporate_fare' },
  { label: 'My Profile',          to: '/dashboard/profile',             icon: 'manage_accounts' },
];

// staff_operator: operational — review eCOs, see members, manage trade fair
const staffNavItems: NavItem[] = [
  { label: 'Dashboard',           to: '/dashboard',                     icon: 'dashboard',   end: true },
  { label: 'eCO Queue',           to: '/dashboard/eco',                 icon: 'task_alt' },
  { label: 'Member Management',   to: '/dashboard/members',             icon: 'manage_accounts' },
  { label: 'Audit Log',           to: '/dashboard/admin',               icon: 'history' },
  { label: 'Trade Fair',          to: '/dashboard/trade-fair',          icon: 'storefront' },
  { label: 'Academy',             to: '/dashboard/academy',             icon: 'school' },
  { label: 'Exporter Visibility', to: '/dashboard/exporter-visibility', icon: 'visibility' },
  { label: 'Export Documents',    to: '/dashboard/export-documents',    icon: 'receipt_long' },
  { label: 'My Chambers',         to: '/dashboard/connections',         icon: 'corporate_fare' },
  { label: 'My Profile',          to: '/dashboard/profile',             icon: 'manage_accounts' },
];

// chamber_admin: full chamber management — all staff items + analytics + academy
const chamberAdminNavItems: NavItem[] = [
  { label: 'Dashboard',           to: '/dashboard',                     icon: 'dashboard',   end: true },
  { label: 'Member Management',   to: '/dashboard/members',             icon: 'manage_accounts' },
  { label: 'Audit Log',           to: '/dashboard/admin',               icon: 'history' },
  { label: 'eCO Queue',           to: '/dashboard/eco',                 icon: 'task_alt' },
  { label: 'Analytics',           to: '/dashboard/analytics',           icon: 'bar_chart' },
  { label: 'Trade Fair',          to: '/dashboard/trade-fair',          icon: 'storefront' },
  { label: 'Trade Corridors',     to: '/dashboard/trade-corridors',     icon: 'route' },
  { label: 'Exporter Visibility', to: '/dashboard/exporter-visibility', icon: 'visibility' },
  { label: 'Export Documents',    to: '/dashboard/export-documents',    icon: 'receipt_long' },
  { label: 'Academy',             to: '/dashboard/academy',             icon: 'school' },
  { label: 'My Chambers',         to: '/dashboard/connections',         icon: 'corporate_fare' },
  { label: 'My Profile',          to: '/dashboard/profile',             icon: 'manage_accounts' },
];

// chamber_executive: read-only analytics view — no write actions
const executiveNavItems: NavItem[] = [
  { label: 'Overview',         to: '/dashboard',              icon: 'dashboard',   end: true },
  { label: 'Analytics',        to: '/dashboard/analytics',    icon: 'bar_chart' },
  { label: 'Member Management',to: '/dashboard/members',      icon: 'manage_accounts' },
  { label: 'Audit Log',        to: '/dashboard/admin',        icon: 'history' },
  { label: 'eCO Queue',        to: '/dashboard/eco',          icon: 'task_alt' },
  { label: 'Trade Fair',       to: '/dashboard/trade-fair',   icon: 'storefront' },
  { label: 'My Chambers',      to: '/dashboard/connections',  icon: 'corporate_fare' },
  { label: 'My Profile',       to: '/dashboard/profile',      icon: 'manage_accounts' },
];

// super_admin: everything including white-label settings
const superAdminNavItems: NavItem[] = [
  { label: 'Dashboard',           to: '/dashboard',                     icon: 'dashboard',   end: true },
  { label: 'Member Management',   to: '/dashboard/members',             icon: 'manage_accounts' },
  { label: 'All Users',           to: '/dashboard/all-users',           icon: 'groups' },
  { label: 'Audit Log',           to: '/dashboard/admin',               icon: 'history' },
  { label: 'eCO Queue',           to: '/dashboard/eco',                 icon: 'task_alt' },
  { label: 'Analytics',           to: '/dashboard/analytics',           icon: 'bar_chart' },
  { label: 'Trade Fair',          to: '/dashboard/trade-fair',          icon: 'storefront' },
  { label: 'Trade Corridors',     to: '/dashboard/trade-corridors',     icon: 'route' },
  { label: 'Exporter Visibility', to: '/dashboard/exporter-visibility', icon: 'visibility' },
  { label: 'Export Documents',    to: '/dashboard/export-documents',    icon: 'receipt_long' },
  { label: 'Academy',             to: '/dashboard/academy',             icon: 'school' },
  { label: 'White-Label',         to: '/dashboard/white-label',         icon: 'corporate_fare' },
  { label: 'Settings',            to: '/dashboard/settings',            icon: 'tune' },
  { label: 'My Chambers',         to: '/dashboard/connections',         icon: 'corporate_fare' },
  { label: 'My Profile',          to: '/dashboard/profile',             icon: 'manage_accounts' },
];

// Modules that assume a chamber relationship — hidden from a `member` with
// ZERO chamber connections (any status counts as "connected"; see
// useHasChamberConnection). Dashboard, eCO Certificates, My Chambers,
// Chamber Network, and My Profile stay visible regardless. Only applies to
// the member-role nav (default branch below) — institutional/staff/
// chamber_admin/executive/super_admin never gate on connection count.
const GATED_LABELS = new Set([
  'Trade Fair',
  'Academy',
  'Export Documents',
  'Membership',
  'Trade Corridors',
  'Exporter Visibility',
]);

function getNavItems(role: Role | null): NavItem[] {
  switch (role) {
    case 'super_admin':            return superAdminNavItems;
    case 'chamber_admin':          return chamberAdminNavItems;
    case 'chamber_executive':      return executiveNavItems;
    case 'staff_operator':         return staffNavItems;
    case 'institutional_subscriber': return institutionalNavItems;
    default:                       return memberNavItems;
  }
}

// "Member Portal" paired with the chamber's own name (e.g. "NACCIMA") read as
// "NACCIMA's Member Portal" — implying the signed-in user is a NACCIMA member
// even when they belong to a different chamber entirely (chamberlink_frontend
// is one shared deployment for every tenant's members). "Chamberlink" is the
// product's own name, not any one chamber's, so it carries no such claim.
const portalLabel: Record<string, string> = {
  member: 'Chamberlink',
  staff_operator: 'Staff Console',
  chamber_admin: 'Admin Console',
  chamber_executive: 'Executive Portal',
  super_admin: 'Super Admin',
  institutional_subscriber: 'Institutional Portal',
};

const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';

const roleLabels: Record<string, string> = {
  member: 'Member',
  staff_operator: 'Staff Operator',
  chamber_admin: 'Chamber Admin',
  chamber_executive: 'Executive',
  super_admin: 'Super Admin',
  institutional_subscriber: 'Institutional',
};

export function Sidebar() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const role = useAppSelector((s) => s.auth.role);
  const [logoutUser] = useLogoutUserMutation();

  // GET /tenants/me is chamber_admin/super_admin only on the backend (chamberAdminOrSuperAdmin
  // middleware) — super_admin doesn't need it here (orgName below hardcodes their label), so
  // only fetch for chamber_admin. staff_operator/chamber_executive used to be included here too
  // and got a 403 on every single page load for a fetch they could never use.
  const isTenantAdmin = role === 'chamber_admin';
  const { data: myTenant } = useGetMyTenantQuery(undefined, { skip: !isTenantAdmin });

  const orgName = role === 'super_admin' ? 'Chamberlink ERP' : (myTenant?.name ?? 'NACCIMA');

  // Shares the same RTK Query cache entry ChamberSwitcher (rendered in
  // DashboardShell's header) already keeps warm — no extra request.
  const { hasConnection, isLoading: isLoadingConnections } = useHasChamberConnection();
  const rawItems = getNavItems(role);
  // While the connections query is still in flight (every fresh session
  // load), default to the FULL list rather than the gated one — the
  // opposite default flashed "limited nav, then expands" for every
  // connected member on load, which read as a bug even though it was just
  // loading state resolving. Optimistically showing everything and
  // narrowing once we KNOW the member has zero connections is a smaller,
  // rarer flash (only zero-connection members see anything narrow at all).
  const visibleItems =
    role === 'member' && !isLoadingConnections && !hasConnection
      ? rawItems.filter((item) => !GATED_LABELS.has(item.label))
      : rawItems;

  const handleLogout = () => {
    const refreshToken = tokenStorage.get();
    if (refreshToken) logoutUser({ refreshToken });

    // If this session arrived via the SSO handoff from chamberlink_website,
    // send the user back there instead of this app's own /login — they
    // never signed in here directly. Checked BEFORE touching Redux: clearing
    // auth state (dispatch(logout())) makes ProtectedRoute redirect to this
    // app's OWN /login instantly, client-side — and since window.location.href
    // is an async navigation, that redirect briefly wins the race and this
    // app's plain /login flashes on screen before the external one takes
    // over. Skipping the local state clear here (the tab is about to fully
    // unload anyway) removes the render that would have caused the flash.
    const origin = returnOrigin.get();
    if (origin) {
      returnOrigin.remove();
      tokenStorage.remove();
      window.location.href = `${origin}/login`;
      return;
    }

    dispatch(logout());
    // Client-side navigation to /login keeps the SPA (and its RTK Query
    // cache) alive in memory — without this, a different account logging in
    // afterward in the same tab briefly renders the PREVIOUS account's
    // cached profile/membership/connections data on first paint, before the
    // real fetch for the new account corrects it. Reported live as "My
    // Profile shows real info, then drops to just Account Details."
    dispatch(emptyApi.util.resetApiState());
    tokenStorage.remove();
    navigate('/login');
  };

  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase()
    || user?.email?.[0]?.toUpperCase()
    || '?';

  // Manual expand/collapse — separate from the md: breakpoint hide/show in
  // DashboardShell, which only reacts to viewport width. This is the user
  // choosing to narrow the sidebar on a desktop-sized screen; persisted so it
  // survives a refresh/new tab.
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1');
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  const navRef = useRef<HTMLElement>(null);
  const [canScrollMore, setCanScrollMore] = useState(false);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const check = () => setCanScrollMore(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
    check();
    el.addEventListener('scroll', check, { passive: true });
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', check); ro.disconnect(); };
  }, [visibleItems]);

  return (
    <aside
      className={`relative flex h-full flex-col bg-primary transition-[width] duration-200 ${collapsed ? 'w-[72px]' : 'w-60'}`}
    >
      {/* Collapse/expand toggle — floats on the sidebar's edge, Notion/Slack-style */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-16 z-10 h-6 w-6 rounded-full border border-border bg-white shadow-sm flex items-center justify-center text-ink-subtle hover:text-primary transition-colors"
      >
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 16, fontVariationSettings: `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 16` }}
        >
          {collapsed ? 'chevron_right' : 'chevron_left'}
        </span>
      </button>

      {/* Logo — white backdrop plate so the multi-color seal doesn't wash out against the blue nav */}
      <div className={`flex items-center gap-3 pt-6 pb-5 border-b border-white/10 ${collapsed ? 'justify-center px-2' : 'px-5'}`}>
        <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
          <img
            src="/naccima-seal.png"
            alt="NACCIMA seal"
            className="h-9 w-9 object-contain"
          />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate">{orgName}</p>
            <p className="text-white/50 text-xs mt-0.5 font-medium truncate">
              {role ? (portalLabel[role] ?? 'Portal') : 'Digital Gateway'}
            </p>
          </div>
        )}
      </div>

      {/* Nav — relative wrapper enables the fade overlay */}
      <div className="relative flex-1 min-h-0">
        <nav ref={navRef} className="h-full px-3 py-4 overflow-y-auto">
          <ul className="space-y-0.5">
            {visibleItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${collapsed ? 'justify-center' : 'gap-3'} ${
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'text-white/60 hover:bg-white/8 hover:text-white/90'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className="material-symbols-outlined flex-shrink-0 select-none"
                      style={{
                        fontSize: 20,
                        fontVariationSettings: `'FILL' ${isActive ? 1 : 0}, 'wght' 400, 'GRAD' 0, 'opsz' 20`,
                        color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                      }}
                    >
                      {item.icon}
                    </span>
                    {!collapsed && <span className={isActive ? 'text-white' : 'text-white/60'}>{item.label}</span>}
                  </>
                )}
              </NavLink>
            </li>
            ))}
          </ul>
        </nav>
        {/* Fade indicator — visible only when more items are below the fold */}
        {canScrollMore && (
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-b from-transparent to-primary" />
        )}
      </div>

      {/* User + Logout */}
      <div className="px-3 pb-4 border-t border-white/10 pt-4">
        {user && (
          <div className={`flex items-center mb-3 ${collapsed ? 'justify-center' : 'gap-3 px-3'}`} title={collapsed ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() : undefined}>
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: '#1b365d', color: '#aec7f7' }}
            >
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-white text-xs font-semibold truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-white/50 text-xs truncate">
                  {role ? (roleLabels[role] ?? role) : ''}
                </p>
              </div>
            )}
          </div>
        )}
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sign Out' : undefined}
          className={`w-full flex items-center rounded-lg px-3 py-2.5 text-sm font-medium text-white/50 hover:bg-white/8 hover:text-white transition-all ${collapsed ? 'justify-center' : 'gap-3'}`}
        >
          <span
            className="material-symbols-outlined flex-shrink-0"
            style={{ fontSize: 20, fontVariationSettings: `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20` }}
          >
            logout
          </span>
          {!collapsed && 'Sign Out'}
        </button>
      </div>
    </aside>
  );
}

import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@shared/hooks/useAppDispatch';
import { logout } from '@features/auth/authSlice';
import { tokenStorage } from '@shared/utils/tokenStorage';
import { useLogoutUserMutation } from '@features/auth/authApi';
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
  { label: 'My Profile',          to: '/dashboard/profile',             icon: 'manage_accounts' },
];

// institutional_subscriber: verify exporters, access trade data — no membership/trade-fair/docs
const institutionalNavItems: NavItem[] = [
  { label: 'Dashboard',           to: '/dashboard',                     icon: 'dashboard',       end: true },
  { label: 'Bank Verification',   to: '/dashboard/bank-verification',   icon: 'verified' },
  { label: 'Exporter Visibility', to: '/dashboard/exporter-visibility', icon: 'visibility' },
  { label: 'Trade Corridors',     to: '/dashboard/trade-corridors',     icon: 'route' },
  { label: 'Trade Data API',      to: '/dashboard/trade-data-api',      icon: 'api' },
  { label: 'My Profile',          to: '/dashboard/profile',             icon: 'manage_accounts' },
];

// staff_operator: operational — review eCOs, see members, manage trade fair
const staffNavItems: NavItem[] = [
  { label: 'Dashboard',           to: '/dashboard',                     icon: 'dashboard',   end: true },
  { label: 'eCO Queue',           to: '/dashboard/eco',                 icon: 'task_alt' },
  { label: 'Members',             to: '/dashboard/admin',               icon: 'group' },
  { label: 'Trade Fair',          to: '/dashboard/trade-fair',          icon: 'storefront' },
  { label: 'Academy',             to: '/dashboard/academy',             icon: 'school' },
  { label: 'Exporter Visibility', to: '/dashboard/exporter-visibility', icon: 'visibility' },
  { label: 'Export Documents',    to: '/dashboard/export-documents',    icon: 'receipt_long' },
  { label: 'My Profile',          to: '/dashboard/profile',             icon: 'manage_accounts' },
];

// chamber_admin: full chamber management — all staff items + analytics + academy
const chamberAdminNavItems: NavItem[] = [
  { label: 'Dashboard',           to: '/dashboard',                     icon: 'dashboard',   end: true },
  { label: 'Members',             to: '/dashboard/admin',               icon: 'group' },
  { label: 'eCO Queue',           to: '/dashboard/eco',                 icon: 'task_alt' },
  { label: 'Analytics',           to: '/dashboard/analytics',           icon: 'bar_chart' },
  { label: 'Trade Fair',          to: '/dashboard/trade-fair',          icon: 'storefront' },
  { label: 'Trade Corridors',     to: '/dashboard/trade-corridors',     icon: 'route' },
  { label: 'Exporter Visibility', to: '/dashboard/exporter-visibility', icon: 'visibility' },
  { label: 'Export Documents',    to: '/dashboard/export-documents',    icon: 'receipt_long' },
  { label: 'Academy',             to: '/dashboard/academy',             icon: 'school' },
  { label: 'My Profile',          to: '/dashboard/profile',             icon: 'manage_accounts' },
];

// kaccima_executive: read-only analytics view — no write actions
const executiveNavItems: NavItem[] = [
  { label: 'Overview',      to: '/dashboard',              icon: 'dashboard',   end: true },
  { label: 'Analytics',     to: '/dashboard/analytics',    icon: 'bar_chart' },
  { label: 'Members',       to: '/dashboard/admin',        icon: 'group' },
  { label: 'eCO Queue',     to: '/dashboard/eco',          icon: 'task_alt' },
  { label: 'Trade Fair',    to: '/dashboard/trade-fair',   icon: 'storefront' },
  { label: 'My Profile',    to: '/dashboard/profile',      icon: 'manage_accounts' },
];

// super_admin: everything including white-label settings
const superAdminNavItems: NavItem[] = [
  { label: 'Dashboard',           to: '/dashboard',                     icon: 'dashboard',   end: true },
  { label: 'Members',             to: '/dashboard/admin',               icon: 'group' },
  { label: 'eCO Queue',           to: '/dashboard/eco',                 icon: 'task_alt' },
  { label: 'Analytics',           to: '/dashboard/analytics',           icon: 'bar_chart' },
  { label: 'Trade Fair',          to: '/dashboard/trade-fair',          icon: 'storefront' },
  { label: 'Trade Corridors',     to: '/dashboard/trade-corridors',     icon: 'route' },
  { label: 'Exporter Visibility', to: '/dashboard/exporter-visibility', icon: 'visibility' },
  { label: 'Export Documents',    to: '/dashboard/export-documents',    icon: 'receipt_long' },
  { label: 'Academy',             to: '/dashboard/academy',             icon: 'school' },
  { label: 'White-Label',         to: '/dashboard/white-label',         icon: 'corporate_fare' },
  { label: 'My Profile',          to: '/dashboard/profile',             icon: 'manage_accounts' },
];

function getNavItems(role: Role | null): NavItem[] {
  switch (role) {
    case 'super_admin':            return superAdminNavItems;
    case 'chamber_admin':          return chamberAdminNavItems;
    case 'kaccima_executive':      return executiveNavItems;
    case 'staff_operator':         return staffNavItems;
    case 'institutional_subscriber': return institutionalNavItems;
    default:                       return memberNavItems;
  }
}

const portalLabel: Record<string, string> = {
  member: 'Member Portal',
  staff_operator: 'Staff Console',
  chamber_admin: 'Admin Console',
  kaccima_executive: 'Executive Portal',
  super_admin: 'Super Admin',
  institutional_subscriber: 'Institutional Portal',
};

const roleLabel: Record<string, string> = {
  member: 'Member',
  staff_operator: 'Staff Operator',
  chamber_admin: 'Chamber Admin',
  kaccima_executive: 'Executive',
  super_admin: 'Super Admin',
  institutional_subscriber: 'Institutional',
};

export function Sidebar() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const role = useAppSelector((s) => s.auth.role);
  const [logoutUser] = useLogoutUserMutation();

  const visibleItems = getNavItems(role);

  const handleLogout = () => {
    const refreshToken = tokenStorage.get();
    if (refreshToken) logoutUser({ refreshToken });
    dispatch(logout());
    tokenStorage.remove();
    navigate('/login');
  };

  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '??';

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
    <aside className="flex h-full w-60 flex-col" style={{ background: '#002046' }}>
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 border-b border-white/10">
        <p className="text-white font-bold text-lg tracking-tight leading-none">KACCIMA</p>
        <p className="text-white/50 text-xs mt-1 font-medium">
          {role ? (portalLabel[role] ?? 'Portal') : 'Digital Gateway'}
        </p>
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
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white/15 text-white'
                      : 'text-white/60 hover:bg-white/8 hover:text-white/90'
                  }`
                }
                style={({ isActive }) => isActive ? {} : {}}
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
                    <span className={isActive ? 'text-white' : 'text-white/60'}>{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
            ))}
          </ul>
        </nav>
        {/* Fade indicator — visible only when more items are below the fold */}
        {canScrollMore && (
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-10"
            style={{ background: 'linear-gradient(to bottom, transparent, #002046)' }}
          />
        )}
      </div>

      {/* User + Logout */}
      <div className="px-3 pb-4 border-t border-white/10 pt-4">
        {user && (
          <div className="flex items-center gap-3 px-3 mb-3">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ background: '#1b365d', color: '#aec7f7' }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-white/50 text-xs truncate">
                {role ? (roleLabel[role] ?? role) : ''}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/50 hover:bg-white/8 hover:text-white transition-all"
        >
          <span
            className="material-symbols-outlined flex-shrink-0"
            style={{ fontSize: 20, fontVariationSettings: `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20` }}
          >
            logout
          </span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}

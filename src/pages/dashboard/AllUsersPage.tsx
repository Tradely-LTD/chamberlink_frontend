import { useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useAppSelector } from '@shared/hooks/useAppDispatch';
import { useGetAllUsersQuery, useUpdateAllUserMutation, useResetUserPasswordMutation } from '@features/admin';
import type { AllUsersListItem } from '@features/admin';
import { useGetTenantsQuery } from '@features/white-label';
import { Card } from '@shared/ui/Card';
import { StatTile } from '@shared/ui/StatTile';
import { Input } from '@shared/ui/Input';
import { Select } from '@shared/ui/Select';
import { Button } from '@shared/ui/Button';
import { Badge } from '@shared/ui/Badge';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { Toast } from '@shared/ui/Toast';
import type { Role } from '@entities/user/types';

const ALL_ROLES: Role[] = [
  'super_admin',
  'chamber_executive',
  'chamber_admin',
  'staff_operator',
  'member',
  'institutional_subscriber',
  'public',
];

const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  chamber_executive: 'Chamber Executive',
  chamber_admin: 'Chamber Admin',
  staff_operator: 'Staff Operator',
  member: 'Member',
  institutional_subscriber: 'Institutional Subscriber',
  public: 'Public',
};

const STAFF_TIER_ROLES: Role[] = ['chamber_admin', 'staff_operator', 'chamber_executive'];
const isStaffTierRole = (role: Role) => STAFF_TIER_ROLES.includes(role);

const roleBadgeVariant = (role: Role): 'default' | 'success' | 'warning' | 'error' => {
  if (role === 'super_admin') return 'error';
  if (isStaffTierRole(role)) return 'warning';
  if (role === 'member') return 'success';
  return 'default';
};

// ── Edit User Modal ─────────────────────────────────────────────────────────

function EditUserModal({ user, tenants, onClose }: {
  user: AllUsersListItem;
  tenants: { id: string; name: string }[];
  onClose: (result?: { warnings: string[] }) => void;
}) {
  const [updateUser, { isLoading }] = useUpdateAllUserMutation();
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(user.role);
  const [isActive, setIsActive] = useState(user.isActive);
  const [tenantId, setTenantId] = useState<string>(user.tenantId ?? '');
  const [chamberTenantIds, setChamberTenantIds] = useState<string[]>(
    user.connections.map((c) => c.tenantId)
  );

  const willLoseConnections = user.role === 'member' && role !== 'member' && user.connections.length > 0;

  const toggleChamber = (id: string, checked: boolean) => {
    setChamberTenantIds((ids) => (checked ? [...ids, id] : ids.filter((x) => x !== id)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const result = await updateUser({
        userId: user.id,
        role,
        isActive,
        ...(isStaffTierRole(role) ? { tenantId: tenantId || null } : {}),
        ...(role === 'member' ? { chamberTenantIds } : {}),
      }).unwrap();
      onClose({ warnings: result.warnings ?? [] });
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message ?? 'Failed to update user. Please try again.';
      setError(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => onClose()} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-border px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="font-bold text-ink">Edit User</h2>
            <p className="text-xs text-ink-subtle mt-0.5">{user.firstName} {user.lastName} · {user.email}</p>
          </div>
          <button onClick={() => onClose()} className="p-2 rounded-lg hover:bg-surface-alt text-ink-subtle">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <ErrorBanner message={error} />}

          <Select label="Role" value={role} onValueChange={(v) => setRole(v as Role)}
            options={ALL_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30" />
            <span className="text-sm text-ink">Account active</span>
          </label>

          {isStaffTierRole(role) && (
            <Select label="Employer Chamber" value={tenantId} onValueChange={setTenantId}
              placeholder="Select a chamber…"
              options={tenants.map((t) => ({ value: t.id, label: t.name }))} />
          )}

          {role === 'member' && (
            <div>
              <label className="block text-sm font-medium text-ink mb-1.5">Connected Chambers</label>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                {tenants.map((t) => (
                  <label key={t.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-surface-alt">
                    <input type="checkbox" checked={chamberTenantIds.includes(t.id)}
                      onChange={(e) => toggleChamber(t.id, e.target.checked)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30" />
                    <span className="text-sm text-ink">{t.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {willLoseConnections && (
            <div className="rounded-lg bg-warning-bg border border-warning/30 px-3 py-2 text-xs text-warning-text">
              Changing this user's role away from Member will disconnect them from {user.connections.length} chamber{user.connections.length === 1 ? '' : 's'}.
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onClose()} className="flex-1">Cancel</Button>
            <Button type="submit" loading={isLoading} className="flex-1">Save Changes</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Reset Password Confirm Modal ────────────────────────────────────────────

// Mirrors the backend's adminResetPasswordSchema (admin/types.ts) — min 8, max 100.
const MIN_PASSWORD_LENGTH = 8;

function ResetPasswordModal({ user, onClose }: {
  user: AllUsersListItem;
  onClose: (result?: { successMessage: string }) => void;
}) {
  const [resetPassword, { isLoading }] = useResetUserPasswordMutation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      await resetPassword({ userId: user.id, newPassword }).unwrap();
      onClose({ successMessage: `Password reset for ${user.email}. The new password is now active on their account.` });
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message ?? 'Failed to reset password. Please try again.';
      setError(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => onClose()} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-ink">Reset Password</h2>
            <p className="text-xs text-ink-subtle mt-0.5">{user.firstName} {user.lastName} · {user.email}</p>
          </div>
          <button onClick={() => onClose()} className="p-2 rounded-lg hover:bg-surface-alt text-ink-subtle">
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <ErrorBanner message={error} />}
          <p className="text-sm text-ink-subtle">
            Set a new password directly on this account. It takes effect immediately — their current password will stop working.
          </p>

          <Input
            label="New Password"
            type={showPasswords ? 'text' : 'password'}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
          <Input
            label="Confirm Password"
            type={showPasswords ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showPasswords} onChange={(e) => setShowPasswords(e.target.checked)}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary/30" />
            <span className="text-sm text-ink-subtle">Show passwords</span>
          </label>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onClose()} className="flex-1">Cancel</Button>
            <Button type="submit" loading={isLoading} className="flex-1">Reset Password</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Row actions dropdown ────────────────────────────────────────────────────

function RowActionsMenu({ onEdit, onResetPassword }: { onEdit: () => void; onResetPassword: () => void }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-ink-subtle hover:bg-surface-alt hover:text-ink outline-none focus:ring-2 focus:ring-primary/40"
          aria-label="Row actions"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>more_vert</span>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-[10rem] overflow-hidden rounded-lg border border-border bg-white shadow-card-hover p-1"
        >
          <DropdownMenu.Item
            onSelect={onEdit}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-ink outline-none cursor-pointer select-none data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>edit</span>
            Edit
          </DropdownMenu.Item>
          <DropdownMenu.Item
            onSelect={onResetPassword}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-ink outline-none cursor-pointer select-none data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>lock_reset</span>
            Reset Password
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ── Main view ────────────────────────────────────────────────────────────────

function AllUsersView() {
  const currentUserId = useAppSelector((s) => s.auth.user?.id);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [tenantFilter, setTenantFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [editingUser, setEditingUser] = useState<AllUsersListItem | null>(null);
  const [resettingUser, setResettingUser] = useState<AllUsersListItem | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useGetAllUsersQuery({
    page,
    limit: 20,
    search: search || undefined,
    role: (roleFilter || undefined) as Role | undefined,
    tenantId: tenantFilter || undefined,
    isActive: activeFilter === '' ? undefined : activeFilter === 'true',
  });
  const { data: tenantsData } = useGetTenantsQuery({ limit: 100 });
  const tenants = tenantsData?.data ?? [];

  const items = data?.items ?? [];

  const handleEditClose = (result?: { warnings: string[] }) => {
    setEditingUser(null);
    if (result?.warnings.length) setWarnings(result.warnings);
  };

  const handleResetClose = (result?: { successMessage: string }) => {
    setResettingUser(null);
    if (result?.successMessage) setSuccessMessage(result.successMessage);
  };

  return (
    <div className="p-6 max-w-6xl">
      {editingUser && (
        <EditUserModal
          user={editingUser}
          tenants={tenants}
          onClose={handleEditClose}
        />
      )}
      {resettingUser && (
        <ResetPasswordModal user={resettingUser} onClose={handleResetClose} />
      )}

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink">Manage All Users</h1>
        <p className="text-sm text-ink-subtle mt-0.5">Every ChamberLink identity, across every chamber — edit roles and chamber assignments.</p>
      </div>

      {warnings.length > 0 && (
        <div className="mb-4 rounded-lg bg-warning-bg border border-warning/30 px-4 py-3 text-sm text-warning-text">
          <p className="font-medium mb-1">Saved with warnings:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {successMessage && (
        <Toast message={successMessage} type="success" onClose={() => setSuccessMessage(null)} />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <StatTile icon="group" label="Total Users" value={(data?.total ?? 0).toLocaleString()} accent />
        <StatTile icon="check_circle" label="Active" value={items.filter((u) => u.isActive).length.toLocaleString()} sublabel="This page" />
        <StatTile icon="admin_panel_settings" label="Staff & Admins" value={items.filter((u) => isStaffTierRole(u.role) || u.role === 'super_admin').length.toLocaleString()} sublabel="This page" />
      </div>

      <Card className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <Input label="Search" placeholder="Name or email" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          <Select label="Role" value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}
            options={[{ value: '', label: 'All roles' }, ...ALL_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] }))]} />
          <Select label="Chamber" value={tenantFilter} onValueChange={(v) => { setTenantFilter(v); setPage(1); }}
            options={[{ value: '', label: 'All chambers' }, ...tenants.map((t) => ({ value: t.id, label: t.name }))]} />
          <Select label="Status" value={activeFilter} onValueChange={(v) => { setActiveFilter(v); setPage(1); }}
            options={[{ value: '', label: 'All' }, { value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} />
        </div>
      </Card>

      {isLoading ? (
        <SkeletonCard className="h-64" />
      ) : isError ? (
        <div className="rounded-xl border border-danger/30 bg-danger-bg p-6">
          <p className="text-sm text-danger-text mb-2">Failed to load users.</p>
          <button onClick={refetch} className="text-sm text-primary hover:underline">Retry</button>
        </div>
      ) : items.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-sm text-ink-subtle">No users match these filters.</p>
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt">
                  {['Name / Email', 'Role', 'Chamber', 'Status', ''].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-ink-subtle text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-alt transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-ink-subtle">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={roleBadgeVariant(u.role)}>{ROLE_LABELS[u.role]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-ink">
                      {isStaffTierRole(u.role) ? (u.tenantName ?? '—')
                        : u.role === 'member' ? (u.connections.length > 0 ? `${u.connections.length} chamber${u.connections.length === 1 ? '' : 's'}` : '—')
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={u.isActive ? 'success' : 'error'}>{u.isActive ? 'Active' : 'Inactive'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.id === currentUserId ? (
                        <span className="text-xs text-ink-subtle italic">This is you</span>
                      ) : (
                        <div className="flex justify-end">
                          <RowActionsMenu
                            onEdit={() => setEditingUser(u)}
                            onResetPassword={() => setResettingUser(u)}
                          />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="text-sm text-primary hover:underline disabled:opacity-40 disabled:no-underline">Previous</button>
              <span className="text-xs text-ink-subtle">Page {data.page} of {data.totalPages}</span>
              <button disabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="text-sm text-primary hover:underline disabled:opacity-40 disabled:no-underline">Next</button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

// ── Access guard ───────────────────────────────────────────────────────────

export function AllUsersPage() {
  const role = useAppSelector((s) => s.auth.role);
  if (role !== 'super_admin') {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-danger-bg">
            <span className="material-symbols-outlined text-danger" style={{ fontSize: 32, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 32` }}>
              lock
            </span>
          </div>
          <h2 className="font-bold text-ink mb-2">Access Restricted</h2>
          <p className="text-sm text-ink-subtle">This page is available to Super Admins only.</p>
        </div>
      </div>
    );
  }
  return <AllUsersView />;
}

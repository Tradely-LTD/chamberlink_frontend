import { useState } from 'react';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { Button } from '@shared/ui/Button';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { useAppSelector } from '@shared/hooks/useAppDispatch';
import {
  useGetTenantsQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  MODULE_KEYS,
} from '@features/white-label';
import type { Tenant, CreateTenantPayload } from '@features/white-label';

// ── Status config ─────────────────────────────────────────────────────────

const tenantStatusConfig: Record<Tenant['status'], { label: string; bg: string; text: string }> = {
  active:    { label: 'Active',    bg: '#a0f4ca', text: '#005137' },
  suspended: { label: 'Suspended', bg: '#ffdad6', text: '#93000a' },
  trial:     { label: 'Trial',     bg: '#ffdea5', text: '#5d4201' },
};

// ── Create Tenant Modal ────────────────────────────────────────────────────

type CreateForm = Omit<CreateTenantPayload, 'enabledModules'> & {
  primaryColor: string;
  secondaryColor: string;
  enabledModules: string[];
};

const EMPTY_CREATE_FORM: CreateForm = {
  name: '',
  slug: '',
  region: '',
  rcNumber: '',
  chamberAdminEmail: '',
  chamberAdminFirstName: '',
  chamberAdminLastName: '',
  primaryColor: '#023293',
  secondaryColor: '#ffffff',
  tagline: '',
  city: '',
  enabledModules: [],
};

function CreateTenantModal({ onClose }: { onClose: () => void }) {
  const [createTenant, { isLoading }] = useCreateTenantMutation();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateForm>(EMPTY_CREATE_FORM);

  const setField =
    (key: keyof Omit<CreateForm, 'enabledModules'>) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleModule = (key: string, checked: boolean) => {
    setForm((f) => ({
      ...f,
      enabledModules: checked
        ? [...f.enabledModules, key]
        : f.enabledModules.filter((k) => k !== key),
    }));
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    try {
      const payload: CreateTenantPayload = {
        name: form.name,
        slug: form.slug,
        region: form.region,
        rcNumber: form.rcNumber,
        chamberAdminEmail: form.chamberAdminEmail,
        chamberAdminFirstName: form.chamberAdminFirstName,
        chamberAdminLastName: form.chamberAdminLastName,
        ...(form.primaryColor ? { primaryColor: form.primaryColor } : {}),
        ...(form.secondaryColor ? { secondaryColor: form.secondaryColor } : {}),
        ...(form.tagline ? { tagline: form.tagline } : {}),
        ...(form.city ? { city: form.city } : {}),
        enabledModules: form.enabledModules,
      };
      await createTenant(payload).unwrap();
      onClose();
    } catch {
      setError('Failed to create tenant. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#e0e3e5] px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="font-bold text-[#191c1e]">Create New Tenant</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#f7f9fb] text-[#74777f]"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <ErrorBanner message={error} />}

          {/* Required fields */}
          <div>
            <label className="block text-xs font-semibold text-[#44474e] mb-1">
              Organisation Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.name}
              onChange={setField('name')}
              placeholder="e.g. Kaduna Chamber of Commerce"
              className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#023293]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#44474e] mb-1">
              Slug (URL identifier) <span className="text-red-500">*</span>{' '}
              <span className="text-[#74777f] font-normal">(lowercase letters and hyphens only)</span>
            </label>
            <input
              required
              value={form.slug}
              onChange={setField('slug')}
              placeholder="e.g. kadccima"
              pattern="[a-z0-9\-]+"
              className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#023293]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#44474e] mb-1">
              Region / State <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.region}
              onChange={setField('region')}
              placeholder="e.g. Kano State"
              className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#023293]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#44474e] mb-1">
              RC Number <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.rcNumber}
              onChange={setField('rcNumber')}
              placeholder="e.g. RC1234567"
              className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#023293]"
            />
          </div>

          {/* Chamber admin fields */}
          <div className="border-t border-[#e0e3e5] pt-4">
            <p className="text-xs font-semibold text-[#44474e] mb-3 uppercase tracking-wide">
              Chamber Administrator
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#44474e] mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.chamberAdminFirstName}
                  onChange={setField('chamberAdminFirstName')}
                  placeholder="First name"
                  className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#023293]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#44474e] mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.chamberAdminLastName}
                  onChange={setField('chamberAdminLastName')}
                  placeholder="Last name"
                  className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#023293]"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-semibold text-[#44474e] mb-1">
                Admin Email <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="email"
                value={form.chamberAdminEmail}
                onChange={setField('chamberAdminEmail')}
                placeholder="admin@organisation.ng"
                className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#023293]"
              />
            </div>
          </div>

          {/* Optional branding */}
          <div className="border-t border-[#e0e3e5] pt-4">
            <p className="text-xs font-semibold text-[#44474e] mb-3 uppercase tracking-wide">
              Branding (optional)
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#44474e] mb-1">
                  Primary Colour
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.primaryColor}
                    onChange={setField('primaryColor')}
                    className="h-9 w-12 rounded border border-[#c4c6cf] p-1 cursor-pointer"
                  />
                  <code className="text-sm text-[#74777f]">{form.primaryColor}</code>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#44474e] mb-1">
                  Secondary Colour
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.secondaryColor}
                    onChange={setField('secondaryColor')}
                    className="h-9 w-12 rounded border border-[#c4c6cf] p-1 cursor-pointer"
                  />
                  <code className="text-sm text-[#74777f]">{form.secondaryColor}</code>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-[#44474e] mb-1">
                  Tagline
                </label>
                <input
                  value={form.tagline ?? ''}
                  onChange={setField('tagline')}
                  placeholder="e.g. Growing Commerce Together"
                  className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#023293]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#44474e] mb-1">
                  City
                </label>
                <input
                  value={form.city ?? ''}
                  onChange={setField('city')}
                  placeholder="e.g. Kaduna"
                  className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#023293]"
                />
              </div>
            </div>
          </div>

          {/* Module selection */}
          <div className="border-t border-[#e0e3e5] pt-4">
            <label className="block text-sm font-medium mb-2 text-[#44474e]">
              Enabled Modules
            </label>
            <div className="grid grid-cols-2 gap-2">
              {MODULE_KEYS.map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm text-[#191c1e] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.enabledModules.includes(key)}
                    onChange={(e) => toggleModule(key, e.target.checked)}
                    className="rounded border-[#c4c6cf]"
                  />
                  {key}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Cancel
            </Button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: '#023293' }}
            >
              {isLoading ? 'Creating…' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Edit Tenant Modal ──────────────────────────────────────────────────────

type EditForm = {
  name: string;
  region: string;
  city: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  status: Tenant['status'];
};

function EditTenantModal({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const [updateTenant, { isLoading }] = useUpdateTenantMutation();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<EditForm>({
    name: tenant.name,
    region: tenant.region,
    city: tenant.city ?? '',
    tagline: tenant.tagline ?? '',
    primaryColor: tenant.primaryColor ?? '#023293',
    secondaryColor: tenant.secondaryColor ?? '#ffffff',
    address: tenant.address ?? '',
    phone: tenant.phone ?? '',
    email: tenant.email ?? '',
    website: tenant.website ?? '',
    status: tenant.status,
  });

  const setField =
    (key: keyof Omit<EditForm, 'status'>) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError(null);
    try {
      await updateTenant({
        id: tenant.id,
        name: form.name || undefined,
        region: form.region || undefined,
        city: form.city || undefined,
        tagline: form.tagline || undefined,
        primaryColor: form.primaryColor || undefined,
        secondaryColor: form.secondaryColor || undefined,
        address: form.address || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        website: form.website || undefined,
        status: form.status,
      }).unwrap();
      onClose();
    } catch {
      setError('Failed to update tenant. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#e0e3e5] px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="font-bold text-[#191c1e]">Edit Tenant</h2>
            <p className="text-xs text-[#74777f] mt-0.5 font-mono">/{tenant.slug}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#f7f9fb] text-[#74777f]"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <ErrorBanner message={error} />}

          {/* Core details */}
          <div>
            <label className="block text-xs font-semibold text-[#44474e] mb-1">
              Organisation Name <span className="text-red-500">*</span>
            </label>
            <input
              required
              value={form.name}
              onChange={setField('name')}
              className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#023293]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#44474e] mb-1">Region / State</label>
              <input
                value={form.region}
                onChange={setField('region')}
                placeholder="e.g. Kano State"
                className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#023293]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#44474e] mb-1">City</label>
              <input
                value={form.city}
                onChange={setField('city')}
                placeholder="e.g. Kano"
                className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#023293]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#44474e] mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Tenant['status'] }))}
              className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#023293] bg-white"
            >
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* Branding */}
          <div className="border-t border-[#e0e3e5] pt-4">
            <p className="text-xs font-semibold text-[#44474e] mb-3 uppercase tracking-wide">Branding</p>
            <div>
              <label className="block text-xs font-semibold text-[#44474e] mb-1">Tagline</label>
              <input
                value={form.tagline}
                onChange={setField('tagline')}
                placeholder="e.g. Growing Commerce Together"
                className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#023293]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-[#44474e] mb-1">Primary Colour</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.primaryColor}
                    onChange={setField('primaryColor')}
                    className="h-9 w-12 rounded border border-[#c4c6cf] p-1 cursor-pointer"
                  />
                  <code className="text-sm text-[#74777f]">{form.primaryColor}</code>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#44474e] mb-1">Secondary Colour</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.secondaryColor}
                    onChange={setField('secondaryColor')}
                    className="h-9 w-12 rounded border border-[#c4c6cf] p-1 cursor-pointer"
                  />
                  <code className="text-sm text-[#74777f]">{form.secondaryColor}</code>
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="border-t border-[#e0e3e5] pt-4">
            <p className="text-xs font-semibold text-[#44474e] mb-3 uppercase tracking-wide">Contact Details</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#44474e] mb-1">Address</label>
                <input
                  value={form.address}
                  onChange={setField('address')}
                  placeholder="Chamber street address"
                  className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#023293]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#44474e] mb-1">Phone</label>
                  <input
                    value={form.phone}
                    onChange={setField('phone')}
                    placeholder="+234 700 000 0000"
                    className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#023293]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#44474e] mb-1">Public Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={setField('email')}
                    placeholder="info@chamber.ng"
                    className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#023293]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#44474e] mb-1">Website</label>
                <input
                  value={form.website}
                  onChange={setField('website')}
                  placeholder="https://chamber.ng"
                  className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#023293]"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: '#023293' }}
            >
              {isLoading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Module Config Panel ────────────────────────────────────────────────────

function ModuleConfigPanel({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const [updateTenant, { isLoading }] = useUpdateTenantMutation();
  const [selectedModules, setSelectedModules] = useState<string[]>(tenant.enabledModules);

  const toggle = (key: string) =>
    setSelectedModules((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  const handleSave = async () => {
    try {
      await updateTenant({ id: tenant.id, enabledModules: selectedModules }).unwrap();
      onClose();
    } catch {
      // silent — list refetch via invalidatesTags
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#e0e3e5] px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="font-bold text-[#191c1e]">Module Configuration</h2>
            <p className="text-xs text-[#74777f] mt-0.5">{tenant.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[#f7f9fb] text-[#74777f]"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
          </button>
        </div>
        <div className="p-6 space-y-2">
          {MODULE_KEYS.map((key) => {
            const enabled = selectedModules.includes(key);
            return (
              <label
                key={key}
                className="flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors"
                style={{
                  borderColor: enabled ? '#023293' : '#e0e3e5',
                  background: enabled ? '#f0f4ff' : 'white',
                }}
              >
                <span className="text-sm text-[#191c1e] font-medium">{key}</span>
                <div
                  className="relative w-9 h-5 rounded-full transition-colors flex-shrink-0"
                  style={enabled ? { background: '#023293' } : { background: '#e0e3e5' }}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      enabled ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => toggle(key)}
                    className="sr-only"
                  />
                </div>
              </label>
            );
          })}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <button
              disabled={isLoading}
              onClick={handleSave}
              className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              style={{ background: '#023293' }}
            >
              {isLoading ? 'Saving…' : 'Save Modules'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main View (super_admin only) ───────────────────────────────────────────

function WhiteLabelView() {
  const [updateTenant] = useUpdateTenantMutation();
  const { data: tenantsData, isLoading, isError, error, refetch } = useGetTenantsQuery({});
  const [showCreate, setShowCreate] = useState(false);
  const [modulesTenant, setModulesTenant] = useState<Tenant | null>(null);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);

  const tenants = tenantsData?.data ?? [];

  const handleStatusChange = (tenant: Tenant, newStatus: Tenant['status']) => {
    updateTenant({ id: tenant.id, status: newStatus });
  };

  return (
    <div className="p-6 max-w-6xl">
      {showCreate && <CreateTenantModal onClose={() => setShowCreate(false)} />}
      {editTenant && (
        <EditTenantModal tenant={editTenant} onClose={() => setEditTenant(null)} />
      )}
      {modulesTenant && (
        <ModuleConfigPanel tenant={modulesTenant} onClose={() => setModulesTenant(null)} />
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#191c1e]">
            Multi-Tenant White-Label Console
          </h2>
          <p className="text-sm text-[#74777f] mt-0.5">
            Manage Chamberlink ERP tenants, branding, and module access.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
          style={{ background: '#023293' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
          New Tenant
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        {[
          {
            icon: 'corporate_fare',
            label: 'Total Tenants',
            value: tenantsData?.pagination.total ?? tenants.length,
            accent: true,
          },
          {
            icon: 'check_circle',
            label: 'Active',
            value: tenants.filter((t) => t.status === 'active').length,
            accent: false,
          },
          {
            icon: 'science',
            label: 'Trial',
            value: tenants.filter((t) => t.status === 'trial').length,
            accent: false,
          },
        ].map(({ icon, label, value, accent }) => (
          <div
            key={label}
            className={`rounded-xl border p-4 ${accent ? '' : 'bg-white border-[#e0e3e5]'}`}
            style={accent ? { background: '#023293', borderColor: '#023293' } : {}}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: 18,
                  fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 18`,
                  color: accent ? '#aec7f7' : '#74777f',
                }}
              >
                {icon}
              </span>
              <p
                className={`text-xs font-semibold uppercase tracking-wide ${
                  accent ? 'text-[#aec7f7]' : 'text-[#74777f]'
                }`}
              >
                {label}
              </p>
            </div>
            <p className={`text-2xl font-bold ${accent ? 'text-white' : 'text-[#191c1e]'}`}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Tenant list */}
      {isLoading ? (
        <SkeletonCard className="h-64" />
      ) : isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <p className="text-sm font-semibold text-red-700 mb-1">Failed to load tenants</p>
          <p className="text-xs text-red-600 mb-4">
            {(error as { data?: { message?: string } })?.data?.message ?? 'Could not reach /white-label/tenants — check the API and your network.'}
          </p>
          <button
            onClick={() => refetch()}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-300 text-red-700 hover:bg-red-100 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : tenants.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          No tenants yet. Create the first chamber above.
        </div>
      ) : (
        <div className="space-y-4">
          {tenants.map((tenant) => {
            const sc = tenantStatusConfig[tenant.status];
            const enabledCount = tenant.enabledModules.length;
            return (
              <div key={tenant.id} className="bg-white rounded-xl border border-[#e0e3e5] p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: tenant.primaryColor ?? '#023293' }}
                    >
                      <span className="text-white font-bold text-sm">{tenant.name[0]}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-[#191c1e]">{tenant.name}</h3>
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                          style={{ background: sc.bg, color: sc.text }}
                        >
                          {sc.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#74777f] flex-wrap">
                        <span className="font-mono">/{tenant.slug}</span>
                        {tenant.city && <span>{tenant.city}</span>}
                        {tenant.region && <span>{tenant.region}</span>}
                        <span>{enabledCount} modules enabled</span>
                      </div>
                      {tenant.tagline && (
                        <p className="text-xs text-[#74777f] italic mt-0.5">{tenant.tagline}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setEditTenant(tenant)}
                      className="flex items-center gap-1.5 rounded-lg border border-[#c4c6cf] px-3 py-1.5 text-xs font-semibold text-[#191c1e] hover:border-[#023293] hover:text-[#023293] transition-colors"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        edit
                      </span>
                      Edit
                    </button>
                    <button
                      onClick={() => setModulesTenant(tenant)}
                      className="flex items-center gap-1.5 rounded-lg border border-[#c4c6cf] px-3 py-1.5 text-xs font-semibold text-[#191c1e] hover:border-[#023293] hover:text-[#023293] transition-colors"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        tune
                      </span>
                      Modules
                    </button>
                    {tenant.status === 'active' && (
                      <button
                        onClick={() => handleStatusChange(tenant, 'suspended')}
                        className="rounded-lg border border-[#ffdad6] px-3 py-1.5 text-xs font-semibold text-[#93000a] hover:bg-[#ffdad6] transition-colors"
                      >
                        Suspend
                      </button>
                    )}
                    {tenant.status === 'suspended' && (
                      <button
                        onClick={() => handleStatusChange(tenant, 'active')}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                        style={{ background: '#023293' }}
                      >
                        Reinstate
                      </button>
                    )}
                    {tenant.status === 'trial' && (
                      <button
                        onClick={() => handleStatusChange(tenant, 'active')}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                        style={{ background: '#0b6c4b' }}
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </div>

                {/* Module pills */}
                {tenant.enabledModules.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tenant.enabledModules.map((mod) => (
                      <span
                        key={mod}
                        className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{ background: '#d6e3ff', color: '#023293' }}
                      >
                        {mod}
                      </span>
                    ))}
                  </div>
                )}

                <p className="text-xs text-[#74777f] mt-3">
                  Created:{' '}
                  {new Date(tenant.createdAt).toLocaleDateString('en-NG', {
                    timeZone: 'Africa/Lagos',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Access guard ───────────────────────────────────────────────────────────

export function WhiteLabelPage() {
  const role = useAppSelector((s) => s.auth.role);
  if (role !== 'super_admin') {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: '#ffdad6' }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 32,
                fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 32`,
                color: '#93000a',
              }}
            >
              lock
            </span>
          </div>
          <h2 className="font-bold text-[#191c1e] mb-2">Access Restricted</h2>
          <p className="text-sm text-[#74777f]">
            This console is available to Super Admins only.
          </p>
        </div>
      </div>
    );
  }
  return <WhiteLabelView />;
}

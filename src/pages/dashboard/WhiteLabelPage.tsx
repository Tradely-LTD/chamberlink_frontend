import { useState } from 'react';
import { emptyApi } from '@shared/api/emptyApi';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { Button } from '@shared/ui/Button';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { useAppSelector } from '@shared/hooks/useAppDispatch';

// ── Types ─────────────────────────────────────────────────────────────────

interface TenantModule {
  key: string;
  label: string;
  enabled: boolean;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  primaryColor: string;
  logoUrl?: string;
  domain?: string;
  status: 'active' | 'suspended' | 'trial';
  plan: 'starter' | 'professional' | 'enterprise';
  memberCount: number;
  modules: TenantModule[];
  createdAt: string;
  expiresAt?: string;
  contactEmail: string;
}

interface ApiResponse<T> { success: boolean; data: T; }

// ── API ───────────────────────────────────────────────────────────────────

const whiteLabelApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    getTenants: builder.query<Tenant[], void>({
      query: () => '/white-label/tenants',
      transformResponse: (res: ApiResponse<Tenant[]>) => res.data,
      providesTags: ['WhiteLabel'],
    }),
    createTenant: builder.mutation<Tenant, Partial<Tenant>>({
      query: (body) => ({ url: '/white-label/tenants', method: 'POST', body }),
      transformResponse: (res: ApiResponse<Tenant>) => res.data,
      invalidatesTags: ['WhiteLabel'],
    }),
    updateTenant: builder.mutation<Tenant, { id: string } & Partial<Tenant>>({
      query: ({ id, ...body }) => ({ url: `/white-label/tenants/${id}`, method: 'PATCH', body }),
      transformResponse: (res: ApiResponse<Tenant>) => res.data,
      invalidatesTags: ['WhiteLabel'],
    }),
    updateTenantModules: builder.mutation<void, { id: string; modules: TenantModule[] }>({
      query: ({ id, ...body }) => ({ url: `/white-label/tenants/${id}/modules`, method: 'PUT', body }),
      invalidatesTags: ['WhiteLabel'],
    }),
    updateTenantStatus: builder.mutation<void, { id: string; status: Tenant['status'] }>({
      query: ({ id, ...body }) => ({ url: `/white-label/tenants/${id}/status`, method: 'PATCH', body }),
      invalidatesTags: ['WhiteLabel'],
    }),
  }),
  overrideExisting: false,
});

const {
  useGetTenantsQuery,
  useCreateTenantMutation,
  useUpdateTenantModulesMutation,
  useUpdateTenantStatusMutation,
} = whiteLabelApi;

// ── Demo data ─────────────────────────────────────────────────────────────

const defaultModules: TenantModule[] = [
  { key: 'membership', label: 'Membership Management', enabled: true },
  { key: 'eco', label: 'eCO / Certificate of Origin', enabled: true },
  { key: 'trade_fair', label: 'Trade Fair & Booth Booking', enabled: true },
  { key: 'academy', label: 'Academy / Training', enabled: true },
  { key: 'documents', label: 'Export Documents', enabled: true },
  { key: 'analytics', label: 'Analytics Dashboard', enabled: true },
  { key: 'trade_corridors', label: 'Sponsored Trade Corridors', enabled: false },
  { key: 'exporter_visibility', label: 'Exporter Visibility Manager', enabled: false },
  { key: 'bank_verification', label: 'Bank & FI Verification', enabled: false },
  { key: 'trade_data_api', label: 'Verified Business Data API', enabled: false },
];

const demoTenants: Tenant[] = [
  { id: 't1', name: 'KACCIMA (Primary)', slug: 'kaccima', primaryColor: '#002046', domain: 'portal.kaccima.ng', status: 'active', plan: 'enterprise', memberCount: 4821, modules: defaultModules.map((m) => ({ ...m, enabled: true })), createdAt: '2024-01-01T00:00:00Z', contactEmail: 'admin@kaccima.ng' },
  { id: 't2', name: 'Kaduna Chamber of Commerce', slug: 'kadccima', primaryColor: '#6B21A8', domain: 'portal.kadccima.ng', status: 'active', plan: 'professional', memberCount: 1240, modules: defaultModules, createdAt: '2024-07-15T00:00:00Z', expiresAt: '2025-07-15T00:00:00Z', contactEmail: 'admin@kadccima.ng' },
  { id: 't3', name: 'Abuja Chamber Pilot', slug: 'abjcham', primaryColor: '#0369A1', status: 'trial', plan: 'starter', memberCount: 0, modules: defaultModules.map((m) => ({ ...m, enabled: ['membership', 'eco'].includes(m.key) })), createdAt: '2025-04-01T00:00:00Z', expiresAt: '2025-07-01T00:00:00Z', contactEmail: 'admin@abjcham.ng' },
];

const planConfig = {
  starter:      { label: 'Starter',      bg: '#e0e3e5', text: '#44474e' },
  professional: { label: 'Professional', bg: '#d6e3ff', text: '#001b3d' },
  enterprise:   { label: 'Enterprise',   bg: '#ffdea5', text: '#5d4201' },
};

const tenantStatusConfig = {
  active:    { label: 'Active',    bg: '#a0f4ca', text: '#005137' },
  suspended: { label: 'Suspended', bg: '#ffdad6', text: '#93000a' },
  trial:     { label: 'Trial',     bg: '#ffdea5', text: '#5d4201' },
};

// ── Create Tenant Modal ────────────────────────────────────────────────────

function CreateTenantModal({ onClose }: { onClose: () => void }) {
  const [createTenant, { isLoading }] = useCreateTenantMutation();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', slug: '', primaryColor: '#002046', domain: '', contactEmail: '', plan: 'starter' as Tenant['plan'] });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault(); setError(null);
    try {
      await createTenant({ ...form, modules: defaultModules, status: 'trial' }).unwrap();
      onClose();
    } catch { setError('Failed to create tenant. Please try again.'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-[#e0e3e5] px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h2 className="font-bold text-[#191c1e]">Create New Tenant</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#f7f9fb] text-[#74777f]"><span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <ErrorBanner message={error} />}
          {[
            { label: 'Organisation Name', key: 'name' as const, placeholder: 'e.g. Kaduna Chamber of Commerce' },
            { label: 'Slug (URL identifier)', key: 'slug' as const, placeholder: 'e.g. kadccima' },
            { label: 'Custom Domain (optional)', key: 'domain' as const, placeholder: 'e.g. portal.kadccima.ng' },
            { label: 'Contact Email', key: 'contactEmail' as const, placeholder: 'admin@organisation.ng' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-semibold text-[#44474e] mb-1">{label}</label>
              <input required={key !== 'domain'} value={form[key]} onChange={set(key)} placeholder={placeholder} className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none focus:border-[#002046]" />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#44474e] mb-1">Plan</label>
              <select value={form.plan} onChange={set('plan')} className="w-full rounded-lg border border-[#c4c6cf] px-3 py-2 text-sm focus:outline-none">
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#44474e] mb-1">Brand Colour</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form.primaryColor} onChange={set('primaryColor')} className="h-9 w-12 rounded border border-[#c4c6cf] p-1 cursor-pointer" />
                <code className="text-sm text-[#74777f]">{form.primaryColor}</code>
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <button type="submit" disabled={isLoading} className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#002046' }}>
              {isLoading ? 'Creating…' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Module Config Panel ────────────────────────────────────────────────────

function ModuleConfigPanel({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const [updateModules, { isLoading }] = useUpdateTenantModulesMutation();
  const [modules, setModules] = useState<TenantModule[]>(tenant.modules);

  const toggle = (key: string) =>
    setModules((m) => m.map((mod) => mod.key === key ? { ...mod, enabled: !mod.enabled } : mod));

  const handleSave = async () => {
    try { await updateModules({ id: tenant.id, modules }).unwrap(); onClose(); }
    catch { /* silent */ }
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
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#f7f9fb] text-[#74777f]"><span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span></button>
        </div>
        <div className="p-6 space-y-2">
          {modules.map((mod) => (
            <label key={mod.key} className="flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors" style={{ borderColor: mod.enabled ? '#002046' : '#e0e3e5', background: mod.enabled ? '#f0f4ff' : 'white' }}>
              <span className="text-sm text-[#191c1e] font-medium">{mod.label}</span>
              <div className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${mod.enabled ? '' : 'bg-[#e0e3e5]'}`} style={mod.enabled ? { background: '#002046' } : {}}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${mod.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                <input type="checkbox" checked={mod.enabled} onChange={() => toggle(mod.key)} className="sr-only" />
              </div>
            </label>
          ))}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <button disabled={isLoading} onClick={handleSave} className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#002046' }}>
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
  const { data: tenants, isLoading } = useGetTenantsQuery();
  const [updateStatus] = useUpdateTenantStatusMutation();
  const [showCreate, setShowCreate] = useState(false);
  const [modulesTenant, setModulesTenant] = useState<Tenant | null>(null);

  const allTenants = tenants ?? demoTenants;

  return (
    <div className="p-6 max-w-6xl">
      {showCreate && <CreateTenantModal onClose={() => setShowCreate(false)} />}
      {modulesTenant && <ModuleConfigPanel tenant={modulesTenant} onClose={() => setModulesTenant(null)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#191c1e]">Multi-Tenant White-Label Console</h2>
          <p className="text-sm text-[#74777f] mt-0.5">Manage TradelyX platform tenants, branding, and module access.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: '#002046' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>New Tenant
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { icon: 'corporate_fare', label: 'Total Tenants', value: allTenants.length, accent: true },
          { icon: 'check_circle', label: 'Active', value: allTenants.filter((t) => t.status === 'active').length },
          { icon: 'science', label: 'Trial', value: allTenants.filter((t) => t.status === 'trial').length },
          { icon: 'group', label: 'Total Members', value: allTenants.reduce((s, t) => s + t.memberCount, 0).toLocaleString() },
        ].map(({ icon, label, value, accent }) => (
          <div key={label} className={`rounded-xl border p-4 ${accent ? '' : 'bg-white border-[#e0e3e5]'}`} style={accent ? { background: '#002046', borderColor: '#002046' } : {}}>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 18`, color: accent ? '#aec7f7' : '#74777f' }}>{icon}</span>
              <p className={`text-xs font-semibold uppercase tracking-wide ${accent ? 'text-[#aec7f7]' : 'text-[#74777f]'}`}>{label}</p>
            </div>
            <p className={`text-2xl font-bold ${accent ? 'text-white' : 'text-[#191c1e]'}`}>{value}</p>
          </div>
        ))}
      </div>

      {isLoading ? <SkeletonCard /> : (
        <div className="space-y-4">
          {allTenants.map((tenant) => {
            const pc = planConfig[tenant.plan];
            const sc = tenantStatusConfig[tenant.status];
            const enabledModules = tenant.modules.filter((m) => m.enabled).length;
            return (
              <div key={tenant.id} className="bg-white rounded-xl border border-[#e0e3e5] p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: tenant.primaryColor }}>
                      <span className="text-white font-bold text-sm">{tenant.name[0]}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-[#191c1e]">{tenant.name}</h3>
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: sc.bg, color: sc.text }}>{sc.label}</span>
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: pc.bg, color: pc.text }}>{pc.label}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[#74777f] flex-wrap">
                        <span className="font-mono">/{tenant.slug}</span>
                        {tenant.domain && <span>{tenant.domain}</span>}
                        <span>{tenant.memberCount.toLocaleString()} members</span>
                        <span>{enabledModules}/{tenant.modules.length} modules</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => setModulesTenant(tenant)} className="flex items-center gap-1.5 rounded-lg border border-[#c4c6cf] px-3 py-1.5 text-xs font-semibold text-[#191c1e] hover:border-[#002046] hover:text-[#002046] transition-colors">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>tune</span>Modules
                    </button>
                    {tenant.status === 'active' && tenant.id !== 't1' && (
                      <button onClick={() => updateStatus({ id: tenant.id, status: 'suspended' })} className="rounded-lg border border-[#ffdad6] px-3 py-1.5 text-xs font-semibold text-[#93000a] hover:bg-[#ffdad6] transition-colors">Suspend</button>
                    )}
                    {tenant.status === 'suspended' && (
                      <button onClick={() => updateStatus({ id: tenant.id, status: 'active' })} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: '#002046' }}>Reinstate</button>
                    )}
                    {tenant.status === 'trial' && (
                      <button onClick={() => updateStatus({ id: tenant.id, status: 'active' })} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white" style={{ background: '#0b6c4b' }}>Activate</button>
                    )}
                  </div>
                </div>

                {/* Module pills */}
                <div className="flex flex-wrap gap-1.5">
                  {tenant.modules.map((mod) => (
                    <span key={mod.key} className="rounded-full px-2.5 py-0.5 text-xs font-medium" style={mod.enabled ? { background: '#d6e3ff', color: '#001b3d' } : { background: '#f7f9fb', border: '1px solid #e0e3e5', color: '#c4c6cf' }}>
                      {mod.label}
                    </span>
                  ))}
                </div>

                {tenant.expiresAt && (
                  <p className="text-xs text-[#74777f] mt-3">
                    Licence expires: {new Date(tenant.expiresAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
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
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#ffdad6' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 32, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 32`, color: '#93000a' }}>lock</span>
          </div>
          <h2 className="font-bold text-[#191c1e] mb-2">Access Restricted</h2>
          <p className="text-sm text-[#74777f]">This console is available to Super Admins only.</p>
        </div>
      </div>
    );
  }
  return <WhiteLabelView />;
}

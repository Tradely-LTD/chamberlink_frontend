import { useState } from 'react';
import { emptyApi } from '@shared/api/emptyApi';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { Button } from '@shared/ui/Button';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { useAppSelector } from '@shared/hooks/useAppDispatch';

// ── Types ─────────────────────────────────────────────────────────────────

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  status: 'active' | 'revoked';
  createdAt: string;
  lastUsedAt?: string;
  requestsThisMonth: number;
  requestLimit: number;
}

interface ApiUsageStat {
  endpoint: string;
  calls: number;
  latencyP95Ms: number;
}

interface ApiConsumer {
  id: string;
  institutionName: string;
  apiKeyCount: number;
  requestsThisMonth: number;
  status: 'active' | 'suspended';
  createdAt: string;
}

interface ApiResponse<T> { success: boolean; data: T; }

// ── API ───────────────────────────────────────────────────────────────────

const tradeDataApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    getMyApiKeys: builder.query<ApiKey[], void>({
      query: () => '/trade-data-api/keys',
      transformResponse: (res: ApiResponse<ApiKey[]>) => res.data,
      providesTags: ['TradeDataApi'],
    }),
    getMyUsageStats: builder.query<ApiUsageStat[], void>({
      query: () => '/trade-data-api/usage',
      transformResponse: (res: ApiResponse<ApiUsageStat[]>) => res.data,
    }),
    createApiKey: builder.mutation<{ key: string; apiKey: ApiKey }, { name: string; permissions: string[] }>({
      query: (body) => ({ url: '/trade-data-api/keys', method: 'POST', body }),
      transformResponse: (res: ApiResponse<{ key: string; apiKey: ApiKey }>) => res.data,
      invalidatesTags: ['TradeDataApi'],
    }),
    revokeApiKey: builder.mutation<void, string>({
      query: (id) => ({ url: `/trade-data-api/keys/${id}/revoke`, method: 'POST' }),
      invalidatesTags: ['TradeDataApi'],
    }),
    getAllConsumers: builder.query<ApiConsumer[], void>({
      query: () => '/trade-data-api/admin/consumers',
      transformResponse: (res: ApiResponse<ApiConsumer[]>) => res.data,
      providesTags: ['TradeDataApi'],
    }),
    updateConsumerStatus: builder.mutation<void, { id: string; status: 'active' | 'suspended' }>({
      query: ({ id, ...body }) => ({ url: `/trade-data-api/admin/consumers/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['TradeDataApi'],
    }),
  }),
  overrideExisting: false,
});

const {
  useGetMyApiKeysQuery,
  useGetMyUsageStatsQuery,
  useCreateApiKeyMutation,
  useRevokeApiKeyMutation,
  useGetAllConsumersQuery,
  useUpdateConsumerStatusMutation,
} = tradeDataApi;

// ── Demo data ─────────────────────────────────────────────────────────────

const demoApiKeys: ApiKey[] = [
  { id: 'k1', name: 'Production Key', keyPrefix: 'kac_live_8f2a...', permissions: ['member.verify', 'eco.verify', 'trade.stats'], status: 'active', createdAt: '2025-01-10T00:00:00Z', lastUsedAt: '2025-04-10T08:30:00Z', requestsThisMonth: 2847, requestLimit: 10000 },
  { id: 'k2', name: 'Testing Key', keyPrefix: 'kac_test_3c9b...', permissions: ['member.verify', 'eco.verify'], status: 'active', createdAt: '2025-01-10T00:00:00Z', lastUsedAt: '2025-04-05T14:22:00Z', requestsThisMonth: 142, requestLimit: 1000 },
];

const demoUsageStats: ApiUsageStat[] = [
  { endpoint: 'GET /v1/members/verify', calls: 1243, latencyP95Ms: 87 },
  { endpoint: 'GET /v1/eco/verify', calls: 982, latencyP95Ms: 92 },
  { endpoint: 'GET /v1/trade/stats', calls: 621, latencyP95Ms: 145 },
  { endpoint: 'GET /v1/members/{id}', calls: 143, latencyP95Ms: 78 },
];

const demoConsumers: ApiConsumer[] = [
  { id: 'c1', institutionName: 'First Bank of Nigeria PLC', apiKeyCount: 2, requestsThisMonth: 3842, status: 'active', createdAt: '2024-11-01T00:00:00Z' },
  { id: 'c2', institutionName: 'Zenith Bank PLC', apiKeyCount: 1, requestsThisMonth: 1204, status: 'active', createdAt: '2025-01-15T00:00:00Z' },
  { id: 'c3', institutionName: 'Access Bank PLC', apiKeyCount: 1, requestsThisMonth: 0, status: 'suspended', createdAt: '2025-02-01T00:00:00Z' },
];

const availablePermissions = [
  { id: 'member.verify', label: 'Member Verification', description: 'Verify member ID and status' },
  { id: 'eco.verify', label: 'eCO Verification', description: 'Verify Certificate of Origin' },
  { id: 'trade.stats', label: 'Trade Statistics', description: 'Access aggregate trade data' },
  { id: 'directory.read', label: 'Exporter Directory', description: 'Read exporter profiles' },
];

const ADMIN_ROLES = ['chamber_admin', 'chamber_executive', 'super_admin', 'staff_operator'];

// ── Create Key Modal ──────────────────────────────────────────────────────

function CreateKeyModal({ onClose, onCreated }: { onClose: () => void; onCreated: (key: string) => void }) {
  const [createKey, { isLoading }] = useCreateApiKeyMutation();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>(['member.verify', 'eco.verify']);

  const togglePerm = (id: string) =>
    setSelectedPerms((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault(); setError(null);
    try {
      const result = await createKey({ name, permissions: selectedPerms }).unwrap();
      onCreated(result.key);
      onClose();
    } catch { setError('Failed to create API key. Please try again.'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="font-bold text-ink">Create API Key</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-alt text-ink-subtle"><span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <ErrorBanner message={error} />}
          <div>
            <label className="block text-xs font-semibold text-ink-subtle mb-1">Key Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Production Key, Test Key" className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-subtle mb-2">Permissions</label>
            <div className="space-y-2">
              {availablePermissions.map((perm) => (
                <label key={perm.id} className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors" style={{ borderColor: selectedPerms.includes(perm.id) ? '#023293' : '#e0e3e5', background: selectedPerms.includes(perm.id) ? '#f0f4ff' : 'white' }}>
                  <input type="checkbox" checked={selectedPerms.includes(perm.id)} onChange={() => togglePerm(perm.id)} className="mt-0.5 accent-primary" />
                  <div>
                    <p className="text-sm font-semibold text-ink">{perm.label}</p>
                    <p className="text-xs text-ink-subtle">{perm.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
            <button type="submit" disabled={isLoading || selectedPerms.length === 0} className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#023293' }}>
              {isLoading ? 'Creating…' : 'Create Key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── New Key Banner ────────────────────────────────────────────────────────

function NewKeyBanner({ apiKey, onDismiss }: { apiKey: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border-2 p-5 mb-6" style={{ borderColor: '#0b6c4b', background: '#a0f4ca30' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#0b6c4b]" style={{ fontSize: 20, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20` }}>check_circle</span>
          <p className="font-bold text-[#005137]">API Key Created — Copy Now</p>
        </div>
        <button onClick={onDismiss} className="p-1 rounded text-ink-subtle"><span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span></button>
      </div>
      <p className="text-xs text-[#005137] mb-3">This key will not be shown again. Copy and store it securely.</p>
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-lg bg-white border border-[#a0f4ca] px-3 py-2 text-sm font-mono text-ink overflow-x-auto">{apiKey}</code>
        <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors" style={{ background: copied ? '#0b6c4b' : '#023293', color: 'white' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{copied ? 'check' : 'content_copy'}</span>
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

// ── Institutional (member) View ────────────────────────────────────────────

function InstitutionalApiView() {
  const { data: keys, isLoading: keysLoading } = useGetMyApiKeysQuery();
  const { data: usageStats } = useGetMyUsageStatsQuery();
  const [revokeKey, { isLoading: revoking }] = useRevokeApiKeyMutation();
  const [showCreate, setShowCreate] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [tab, setTab] = useState<'keys' | 'usage' | 'docs'>('keys');

  const allKeys = keys ?? demoApiKeys;
  const stats = usageStats ?? demoUsageStats;
  const totalRequests = allKeys.reduce((s, k) => s + k.requestsThisMonth, 0);

  return (
    <div className="p-6 max-w-5xl">
      {showCreate && <CreateKeyModal onClose={() => setShowCreate(false)} onCreated={(k) => setNewKey(k)} />}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-ink">Verified Business Data API</h2>
          <p className="text-sm text-ink-subtle mt-0.5">Manage your API keys and integrate NACCIMA verified trade data into your systems.</p>
        </div>
      </div>

      {newKey && <NewKeyBanner apiKey={newKey} onDismiss={() => setNewKey(null)} />}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        {[
          { icon: 'key', label: 'Active Keys', value: allKeys.filter((k) => k.status === 'active').length, accent: true },
          { icon: 'api', label: 'Requests This Month', value: totalRequests.toLocaleString() },
          { icon: 'integration_instructions', label: 'Endpoints', value: stats.length },
        ].map(({ icon, label, value, accent }) => (
          <div key={label} className={`rounded-xl border p-4 ${accent ? '' : 'bg-white border-border'}`} style={accent ? { background: '#023293', borderColor: '#023293' } : {}}>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 18`, color: accent ? '#aec7f7' : '#74777f' }}>{icon}</span>
              <p className={`text-xs font-semibold uppercase tracking-wide ${accent ? 'text-[#aec7f7]' : 'text-ink-subtle'}`}>{label}</p>
            </div>
            <p className={`text-2xl font-bold ${accent ? 'text-white' : 'text-ink'}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-surface-alt rounded-lg p-1 mb-6 w-fit border border-border">
        {([['keys', 'API Keys'], ['usage', 'Usage Stats'], ['docs', 'Documentation']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-ink shadow-sm' : 'text-ink-subtle hover:text-ink'}`}>{label}</button>
        ))}
      </div>

      {tab === 'keys' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: '#023293' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>New API Key
            </button>
          </div>
          {keysLoading ? <SkeletonCard /> : (
            <div className="space-y-3">
              {allKeys.map((k) => {
                const usagePct = Math.min(100, Math.round((k.requestsThisMonth / k.requestLimit) * 100));
                return (
                  <div key={k.id} className="bg-white rounded-xl border border-border p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-ink">{k.name}</p>
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={k.status === 'active' ? { background: '#a0f4ca', color: '#005137' } : { background: '#ffdad6', color: '#93000a' }}>{k.status === 'active' ? 'Active' : 'Revoked'}</span>
                        </div>
                        <code className="text-sm font-mono text-ink-subtle">{k.keyPrefix}</code>
                      </div>
                      {k.status === 'active' && (
                        <button disabled={revoking} onClick={() => revokeKey(k.id)} className="text-xs font-medium px-3 py-1.5 rounded-lg border border-[#ffdad6] text-[#93000a] hover:bg-[#ffdad6] transition-colors disabled:opacity-50">Revoke</button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {k.permissions.map((p) => <span key={p} className="rounded-full px-2 py-0.5 text-xs font-mono" style={{ background: '#f7f9fb', border: '1px solid #e0e3e5', color: '#44474e' }}>{p}</span>)}
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-ink-subtle mb-1">
                        <span>Usage this month</span>
                        <span className="font-semibold">{k.requestsThisMonth.toLocaleString()} / {k.requestLimit.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-border rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${usagePct}%`, background: usagePct > 80 ? '#ba1a1a' : '#023293' }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'usage' && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <p className="text-sm font-semibold text-ink">Endpoint Usage — This Month</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-alt border-b border-border">
                {['Endpoint', 'Calls', 'P95 Latency'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-ink-subtle uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f2f4]">
              {stats.map((s) => (
                <tr key={s.endpoint} className="hover:bg-surface-alt">
                  <td className="px-4 py-3 font-mono text-sm text-ink">{s.endpoint}</td>
                  <td className="px-4 py-3 font-semibold text-ink">{s.calls.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-semibold" style={{ color: s.latencyP95Ms > 200 ? '#ba1a1a' : '#0b6c4b' }}>{s.latencyP95Ms}ms</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'docs' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-border p-6">
            <h3 className="font-bold text-ink mb-1">Base URL</h3>
            <code className="block rounded-lg px-4 py-3 text-sm font-mono text-ink" style={{ background: '#f7f9fb', border: '1px solid #e0e3e5' }}>https://api.chamberlink.ng/v1</code>
          </div>
          <div className="bg-white rounded-xl border border-border p-6">
            <h3 className="font-bold text-ink mb-3">Authentication</h3>
            <p className="text-sm text-ink-subtle mb-3">Pass your API key in the <code className="font-mono text-xs bg-surface-alt px-1 py-0.5 rounded">Authorization</code> header:</p>
            <code className="block rounded-lg px-4 py-3 text-sm font-mono text-ink" style={{ background: '#f7f9fb', border: '1px solid #e0e3e5' }}>{'Authorization: Bearer kac_live_your_key_here'}</code>
          </div>
          <div className="bg-white rounded-xl border border-border p-6">
            <h3 className="font-bold text-ink mb-3">Available Endpoints</h3>
            <div className="space-y-3">
              {[
                { method: 'GET', path: '/members/verify?id={memberId}', desc: 'Verify a member by ID — returns status, tier, expiry.' },
                { method: 'GET', path: '/eco/verify?cert={certNumber}', desc: 'Verify a Certificate of Origin — returns holder, products, validity.' },
                { method: 'GET', path: '/trade/stats?corridor={id}', desc: 'Aggregate trade statistics for a corridor.' },
                { method: 'GET', path: '/directory/exporters', desc: 'List verified exporter profiles (paginated).' },
              ].map(({ method, path, desc }) => (
                <div key={path} className="flex items-start gap-3">
                  <span className="rounded-md px-2 py-0.5 text-xs font-bold flex-shrink-0 mt-0.5" style={{ background: '#d6e3ff', color: '#023293' }}>{method}</span>
                  <div>
                    <code className="text-sm font-mono text-ink">{path}</code>
                    <p className="text-xs text-ink-subtle mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin View ─────────────────────────────────────────────────────────────

function AdminApiView() {
  const { data: consumers, isLoading } = useGetAllConsumersQuery();
  const [updateStatus] = useUpdateConsumerStatusMutation();

  const allConsumers = consumers ?? demoConsumers;
  const totalRequests = allConsumers.reduce((s, c) => s + c.requestsThisMonth, 0);

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-ink">Trade Data API — Consumer Management</h2>
        <p className="text-sm text-ink-subtle mt-0.5">Monitor institutional API consumers and their usage.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { icon: 'business', label: 'Institutions', value: allConsumers.length, accent: true },
          { icon: 'check_circle', label: 'Active', value: allConsumers.filter((c) => c.status === 'active').length },
          { icon: 'api', label: 'Total API Keys', value: allConsumers.reduce((s, c) => s + c.apiKeyCount, 0) },
          { icon: 'trending_up', label: 'Requests / Mo', value: totalRequests.toLocaleString() },
        ].map(({ icon, label, value, accent }) => (
          <div key={label} className={`rounded-xl border p-4 ${accent ? '' : 'bg-white border-border'}`} style={accent ? { background: '#023293', borderColor: '#023293' } : {}}>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 18`, color: accent ? '#aec7f7' : '#74777f' }}>{icon}</span>
              <p className={`text-xs font-semibold uppercase tracking-wide ${accent ? 'text-[#aec7f7]' : 'text-ink-subtle'}`}>{label}</p>
            </div>
            <p className={`text-2xl font-bold ${accent ? 'text-white' : 'text-ink'}`}>{value}</p>
          </div>
        ))}
      </div>

      {isLoading ? <SkeletonCard /> : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-alt border-b border-border">
                  {['Institution', 'API Keys', 'Requests / Month', 'Status', 'Onboarded', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-ink-subtle uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f2f4]">
                {allConsumers.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-alt transition-colors">
                    <td className="px-4 py-3 font-semibold text-ink">{c.institutionName}</td>
                    <td className="px-4 py-3 text-ink">{c.apiKeyCount}</td>
                    <td className="px-4 py-3 font-medium text-ink">{c.requestsThisMonth.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={c.status === 'active' ? { background: '#a0f4ca', color: '#005137' } : { background: '#ffdad6', color: '#93000a' }}>
                        {c.status === 'active' ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-subtle">{new Date(c.createdAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-3">
                      {c.status === 'active'
                        ? <button onClick={() => updateStatus({ id: c.id, status: 'suspended' })} className="text-xs font-medium px-2.5 py-1 rounded-md border border-border text-ink-subtle">Suspend</button>
                        : <button onClick={() => updateStatus({ id: c.id, status: 'active' })} className="text-xs font-medium px-2.5 py-1 rounded-md text-white" style={{ background: '#023293' }}>Reinstate</button>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Router entry ───────────────────────────────────────────────────────────

export function TradeDataApiPage() {
  const role = useAppSelector((s) => s.auth.role);
  const isAdmin = role && ADMIN_ROLES.includes(role);
  return isAdmin ? <AdminApiView /> : <InstitutionalApiView />;
}

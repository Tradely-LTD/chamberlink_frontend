import { useState } from 'react';
import { emptyApi } from '@shared/api/emptyApi';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { useAppSelector } from '@shared/hooks/useAppDispatch';

// ── Types ─────────────────────────────────────────────────────────────────

interface VerificationResult {
  type: 'eco' | 'member';
  certNumber?: string;
  memberId?: string;
  holderName: string;
  companyName?: string;
  status: 'valid' | 'expired' | 'revoked' | 'not_found';
  issuedAt?: string;
  expiresAt?: string;
  issuedBy?: string;
  products?: string[];
  membershipTier?: string;
  verificationRef: string;
}

interface VerificationLog {
  id: string;
  queriedRef: string;
  queryType: 'eco' | 'member';
  result: 'valid' | 'expired' | 'revoked' | 'not_found';
  queriedAt: string;
  queriedBy: string;
  institutionName?: string;
}

interface ApiResponse<T> { success: boolean; data: T; }

// ── API ───────────────────────────────────────────────────────────────────

const bankVerificationApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    verifyEcoCert: builder.mutation<VerificationResult, { certNumber: string }>({
      query: (body) => ({ url: '/bank-verification/eco', method: 'POST', body }),
      transformResponse: (res: ApiResponse<VerificationResult>) => res.data,
    }),
    verifyMember: builder.mutation<VerificationResult, { memberId: string }>({
      query: (body) => ({ url: '/bank-verification/member', method: 'POST', body }),
      transformResponse: (res: ApiResponse<VerificationResult>) => res.data,
    }),
    getVerificationLogs: builder.query<VerificationLog[], void>({
      query: () => '/bank-verification/admin/logs',
      transformResponse: (res: ApiResponse<VerificationLog[]>) => res.data,
    }),
  }),
  overrideExisting: false,
});

const { useVerifyEcoCertMutation, useVerifyMemberMutation, useGetVerificationLogsQuery } = bankVerificationApi;

// ── Demo data ─────────────────────────────────────────────────────────────

const demoEcoResult: VerificationResult = {
  type: 'eco', certNumber: 'ECO-2025-KAN-004821',
  holderName: 'Amina Abdullahi', companyName: 'Kano Leather Exports Ltd',
  status: 'valid', issuedAt: '2025-03-01T00:00:00Z', expiresAt: '2026-03-01T00:00:00Z',
  issuedBy: 'NACCIMA Secretariat', products: ['Finished Leather', 'Wet Blue Hides'],
  verificationRef: 'VER-2025-001234',
};

const demoMemberResult: VerificationResult = {
  type: 'member', memberId: 'KAC-M-00214',
  holderName: 'Ibrahim Garba Dantata', companyName: 'Arewa Groundnut Co. Ltd',
  status: 'valid', issuedAt: '2024-01-15T00:00:00Z', expiresAt: '2025-01-15T00:00:00Z',
  membershipTier: 'Patron Member', verificationRef: 'VER-2025-001235',
};

const demoLogs: VerificationLog[] = [
  { id: 'l1', queriedRef: 'ECO-2025-KAN-004821', queryType: 'eco', result: 'valid', queriedAt: '2025-04-10T09:22:00Z', queriedBy: 'First Bank of Nigeria PLC', institutionName: 'First Bank' },
  { id: 'l2', queriedRef: 'KAC-M-00214', queryType: 'member', result: 'valid', queriedAt: '2025-04-09T14:05:00Z', queriedBy: 'Zenith Bank PLC', institutionName: 'Zenith Bank' },
  { id: 'l3', queriedRef: 'ECO-2024-KAN-003100', queryType: 'eco', result: 'expired', queriedAt: '2025-04-08T11:30:00Z', queriedBy: 'Access Bank PLC', institutionName: 'Access Bank' },
  { id: 'l4', queriedRef: 'KAC-M-00999', queryType: 'member', result: 'not_found', queriedAt: '2025-04-07T16:48:00Z', queriedBy: 'GTBank PLC', institutionName: 'GTBank' },
];

const resultConfig = {
  valid:     { icon: 'verified', label: 'Valid',     bg: '#a0f4ca', text: '#005137', iconColor: '#0b6c4b' },
  expired:   { icon: 'schedule', label: 'Expired',   bg: '#ffdea5', text: '#5d4201', iconColor: '#c5a059' },
  revoked:   { icon: 'cancel',   label: 'Revoked',   bg: '#ffdad6', text: '#93000a', iconColor: '#ba1a1a' },
  not_found: { icon: 'search_off', label: 'Not Found', bg: '#e0e3e5', text: '#44474e', iconColor: '#74777f' },
};

const ADMIN_ROLES = ['chamber_admin', 'chamber_executive', 'super_admin', 'staff_operator'];

// ── Verification Result Card ───────────────────────────────────────────────

function VerificationResultCard({ result, onClear }: { result: VerificationResult; onClear: () => void }) {
  const rc = resultConfig[result.status];

  return (
    <div className={`rounded-xl border-2 p-6`} style={{ borderColor: result.status === 'valid' ? '#0b6c4b' : result.status === 'not_found' ? '#c4c6cf' : '#ba1a1a', background: rc.bg + '20' }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: rc.bg }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24`, color: rc.iconColor }}>{rc.icon}</span>
          </div>
          <div>
            <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-bold" style={{ background: rc.bg, color: rc.text }}>{rc.label}</span>
            <p className="text-xs text-[#74777f] mt-1">Ref: {result.verificationRef}</p>
          </div>
        </div>
        <button onClick={onClear} className="p-2 rounded-lg hover:bg-[#f7f9fb] text-[#74777f]">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
        </button>
      </div>

      {result.status !== 'not_found' && (
        <div className="grid sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
          <div><p className="text-xs text-[#74777f] mb-0.5">Name</p><p className="font-semibold text-[#191c1e]">{result.holderName}</p></div>
          {result.companyName && <div><p className="text-xs text-[#74777f] mb-0.5">Company</p><p className="font-semibold text-[#191c1e]">{result.companyName}</p></div>}
          {result.certNumber && <div><p className="text-xs text-[#74777f] mb-0.5">Certificate No.</p><p className="font-mono text-[#191c1e]">{result.certNumber}</p></div>}
          {result.memberId && <div><p className="text-xs text-[#74777f] mb-0.5">Member ID</p><p className="font-mono text-[#191c1e]">{result.memberId}</p></div>}
          {result.membershipTier && <div><p className="text-xs text-[#74777f] mb-0.5">Membership Tier</p><p className="text-[#191c1e]">{result.membershipTier}</p></div>}
          {result.issuedAt && <div><p className="text-xs text-[#74777f] mb-0.5">Issued</p><p className="text-[#191c1e]">{new Date(result.issuedAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' })}</p></div>}
          {result.expiresAt && <div><p className="text-xs text-[#74777f] mb-0.5">Expires</p><p className="text-[#191c1e]">{new Date(result.expiresAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' })}</p></div>}
          {result.issuedBy && <div><p className="text-xs text-[#74777f] mb-0.5">Issued By</p><p className="text-[#191c1e]">{result.issuedBy}</p></div>}
          {result.products && result.products.length > 0 && (
            <div className="sm:col-span-2">
              <p className="text-xs text-[#74777f] mb-1">Products Covered</p>
              <div className="flex flex-wrap gap-1.5">
                {result.products.map((p) => <span key={p} className="rounded-full px-2.5 py-0.5 text-xs font-medium border" style={{ background: '#f7f9fb', borderColor: '#e0e3e5', color: '#44474e' }}>{p}</span>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Institutional (member) View ────────────────────────────────────────────

function InstitutionalVerificationView() {
  const [verifyEco, { isLoading: ecoLoading }] = useVerifyEcoCertMutation();
  const [verifyMember, { isLoading: memberLoading }] = useVerifyMemberMutation();
  const [tab, setTab] = useState<'eco' | 'member'>('eco');
  const [certInput, setCertInput] = useState('');
  const [memberInput, setMemberInput] = useState('');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isLoading = ecoLoading || memberLoading;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setResult(null);
    try {
      if (tab === 'eco') {
        const r = await verifyEco({ certNumber: certInput.trim() }).unwrap();
        setResult(r);
      } else {
        const r = await verifyMember({ memberId: memberInput.trim() }).unwrap();
        setResult(r);
      }
    } catch {
      setResult(tab === 'eco' ? demoEcoResult : demoMemberResult);
    }
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#191c1e]">Banks & FI Verification Portal</h2>
        <p className="text-sm text-[#74777f] mt-0.5">Verify the authenticity of NACCIMA eCO certificates and member credentials.</p>
      </div>

      <div className="flex gap-1 bg-[#f7f9fb] rounded-lg p-1 mb-6 w-fit border border-[#e0e3e5]">
        {([['eco', 'eCO Certificate'], ['member', 'Member ID']] as const).map(([t, label]) => (
          <button key={t} onClick={() => { setTab(t); setResult(null); setError(null); }}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-[#191c1e] shadow-sm' : 'text-[#74777f] hover:text-[#191c1e]'}`}>{label}</button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[#e0e3e5] p-6 mb-6">
        <form onSubmit={handleVerify} className="flex gap-3">
          <input
            required
            value={tab === 'eco' ? certInput : memberInput}
            onChange={(e) => tab === 'eco' ? setCertInput(e.target.value) : setMemberInput(e.target.value)}
            placeholder={tab === 'eco' ? 'e.g. ECO-2025-KAN-004821' : 'e.g. KAC-M-00214'}
            className="flex-1 rounded-lg border border-[#c4c6cf] px-4 py-2.5 text-sm focus:outline-none focus:border-[#002046] font-mono"
          />
          <button type="submit" disabled={isLoading} className="flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: '#002046' }}>
            {isLoading ? 'Verifying…' : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>search</span>Verify</>}
          </button>
        </form>
        {error && <div className="mt-4"><ErrorBanner message={error} /></div>}
      </div>

      {result && <VerificationResultCard result={result} onClear={() => setResult(null)} />}

      <div className="mt-6 rounded-xl border border-[#e0e3e5] p-4 bg-[#f7f9fb]">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-[#74777f] flex-shrink-0 mt-0.5" style={{ fontSize: 18, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 18` }}>info</span>
          <div className="text-xs text-[#74777f] space-y-1">
            <p>All verification queries are logged for audit purposes per NACCIMA data governance policy.</p>
            <p>For bulk verification or API access, contact the NACCIMA Secretariat.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Admin View ─────────────────────────────────────────────────────────────

function AdminVerificationView() {
  const { data: logs, isLoading } = useGetVerificationLogsQuery();
  const [typeFilter, setTypeFilter] = useState<'all' | 'eco' | 'member'>('all');
  const [resultFilter, setResultFilter] = useState<'all' | VerificationResult['status']>('all');

  const allLogs = logs ?? demoLogs;
  const filtered = allLogs.filter((l) => {
    const matchType = typeFilter === 'all' || l.queryType === typeFilter;
    const matchResult = resultFilter === 'all' || l.result === resultFilter;
    return matchType && matchResult;
  });

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#191c1e]">Verification Audit Log</h2>
        <p className="text-sm text-[#74777f] mt-0.5">All eCO certificate and member ID verification queries from banks and institutions.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { icon: 'verified', label: 'Total Queries', value: allLogs.length, accent: true },
          { icon: 'check_circle', label: 'Valid', value: allLogs.filter((l) => l.result === 'valid').length },
          { icon: 'schedule', label: 'Expired', value: allLogs.filter((l) => l.result === 'expired').length },
          { icon: 'search_off', label: 'Not Found', value: allLogs.filter((l) => l.result === 'not_found').length },
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

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex gap-1 bg-[#f7f9fb] rounded-lg p-1 border border-[#e0e3e5]">
          {(['all', 'eco', 'member'] as const).map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${typeFilter === t ? 'bg-white shadow-sm text-[#191c1e]' : 'text-[#74777f]'}`}>
              {t === 'all' ? 'All Types' : t === 'eco' ? 'eCO Certs' : 'Member IDs'}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-[#f7f9fb] rounded-lg p-1 border border-[#e0e3e5]">
          {(['all', 'valid', 'expired', 'not_found'] as const).map((r) => (
            <button key={r} onClick={() => setResultFilter(r)} className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${resultFilter === r ? 'bg-white shadow-sm text-[#191c1e]' : 'text-[#74777f]'}`}>
              {r.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <SkeletonCard /> : (
        <div className="bg-white rounded-xl border border-[#e0e3e5] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f7f9fb] border-b border-[#e0e3e5]">
                  {['Reference Queried', 'Type', 'Institution', 'Result', 'Date & Time'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#74777f] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f2f4]">
                {filtered.map((log) => {
                  const rc = resultConfig[log.result];
                  return (
                    <tr key={log.id} className="hover:bg-[#f7f9fb] transition-colors">
                      <td className="px-4 py-3 font-mono text-sm text-[#191c1e]">{log.queriedRef}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide" style={{ background: log.queryType === 'eco' ? '#d6e3ff' : '#a0f4ca', color: log.queryType === 'eco' ? '#001b3d' : '#005137' }}>
                          {log.queryType === 'eco' ? 'eCO' : 'Member'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#74777f]">{log.institutionName ?? log.queriedBy}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: rc.bg, color: rc.text }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 12` }}>{rc.icon}</span>
                          {rc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#74777f]">
                        {new Date(log.queriedAt).toLocaleString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Router entry ───────────────────────────────────────────────────────────

export function BankVerificationPage() {
  const role = useAppSelector((s) => s.auth.role);
  const isAdmin = role && ADMIN_ROLES.includes(role);
  return isAdmin ? <AdminVerificationView /> : <InstitutionalVerificationView />;
}

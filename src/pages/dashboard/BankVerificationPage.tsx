import { useState } from 'react';
import { emptyApi } from '@shared/api/emptyApi';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { StatTile } from '@shared/ui/StatTile';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { useAppSelector } from '@shared/hooks/useAppDispatch';
import { PageHeader } from '@shared/ui/PageHeader';

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




const resultConfig = {
  valid:     { icon: 'verified', label: 'Valid',     bg: 'rgb(var(--c-success-bg))', text: 'rgb(var(--c-success))', iconColor: 'rgb(var(--c-success))' },
  expired:   { icon: 'schedule', label: 'Expired',   bg: 'rgb(var(--c-warning-bg))', text: 'rgb(var(--c-warning))', iconColor: 'rgb(var(--c-gold-light))' },
  revoked:   { icon: 'cancel',   label: 'Revoked',   bg: 'rgb(var(--c-danger-bg))', text: 'rgb(var(--c-danger))', iconColor: 'rgb(var(--c-danger))' },
  not_found: { icon: 'search_off', label: 'Not Found', bg: 'rgb(var(--c-border))', text: 'rgb(var(--c-ink-muted))', iconColor: 'rgb(var(--c-ink-subtle))' },
};

const ADMIN_ROLES = ['chamber_admin', 'chamber_executive', 'super_admin', 'staff_operator'];

// ── Verification Result Card ───────────────────────────────────────────────

function VerificationResultCard({ result, onClear }: { result: VerificationResult; onClear: () => void }) {
  const rc = resultConfig[result.status];

  return (
    <div className={`rounded-card border-2 p-6`} style={{ borderColor: result.status === 'valid' ? 'rgb(var(--c-success))' : result.status === 'not_found' ? '#c4c6cf' : 'rgb(var(--c-danger))', background: rc.bg + '20' }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: rc.bg }}>
            <span className="material-symbols-outlined" style={{ fontSize: 24, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24`, color: rc.iconColor }}>{rc.icon}</span>
          </div>
          <div>
            <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold" style={{ background: rc.bg, color: rc.text }}>{rc.label}</span>
            <p className="text-xs text-ink-subtle mt-1">Ref: {result.verificationRef}</p>
          </div>
        </div>
        <button onClick={onClear} className="p-2 rounded-lg hover:bg-surface-alt text-ink-subtle">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
        </button>
      </div>

      {result.status !== 'not_found' && (
        <div className="grid sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
          <div><p className="text-xs text-ink-subtle mb-0.5">Name</p><p className="font-semibold text-ink">{result.holderName}</p></div>
          {result.companyName && <div><p className="text-xs text-ink-subtle mb-0.5">Company</p><p className="font-semibold text-ink">{result.companyName}</p></div>}
          {result.certNumber && <div><p className="text-xs text-ink-subtle mb-0.5">Certificate No.</p><p className="font-mono text-ink">{result.certNumber}</p></div>}
          {result.memberId && <div><p className="text-xs text-ink-subtle mb-0.5">Member ID</p><p className="font-mono text-ink">{result.memberId}</p></div>}
          {result.membershipTier && <div><p className="text-xs text-ink-subtle mb-0.5">Membership Tier</p><p className="text-ink">{result.membershipTier}</p></div>}
          {result.issuedAt && <div><p className="text-xs text-ink-subtle mb-0.5">Issued</p><p className="text-ink">{new Date(result.issuedAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' })}</p></div>}
          {result.expiresAt && <div><p className="text-xs text-ink-subtle mb-0.5">Expires</p><p className="text-ink">{new Date(result.expiresAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' })}</p></div>}
          {result.issuedBy && <div><p className="text-xs text-ink-subtle mb-0.5">Issued By</p><p className="text-ink">{result.issuedBy}</p></div>}
          {result.products && result.products.length > 0 && (
            <div className="sm:col-span-2">
              <p className="text-xs text-ink-subtle mb-1">Products Covered</p>
              <div className="flex flex-wrap gap-1.5">
                {result.products.map((p) => <span key={p} className="rounded-full px-2.5 py-0.5 text-xs font-medium border" style={{ background: 'rgb(var(--c-surface-alt))', borderColor: 'rgb(var(--c-border))', color: 'rgb(var(--c-ink-muted))' }}>{p}</span>)}
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
    } catch (err: unknown) {
      setError((err as { data?: { message?: string } })?.data?.message ?? 'Verification could not be completed. Check the reference and try again.');
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8 [&>*]:max-w-3xl">
      <PageHeader title="Banks & FI Verification Portal" description="Verify the authenticity of NACCIMA eCO certificates and member credentials." />

      <div className="flex items-end gap-6 overflow-x-auto border-b border-border mb-6">
        {([['eco', 'eCO Certificate'], ['member', 'Member ID']] as const).map(([t, label]) => (
          <button key={t} onClick={() => { setTab(t); setResult(null); setError(null); }}
            className={`-mb-px border-b-2 px-1 pb-2.5 pt-1 text-sm font-medium whitespace-nowrap transition-colors focus-visible:shadow-focus ${tab === t ? 'border-primary text-ink' : 'border-transparent text-ink-subtle hover:text-ink hover:border-border-strong'}`}>{label}</button>
        ))}
      </div>

      <div className="bg-surface rounded-card border border-border p-6 mb-6">
        <form onSubmit={handleVerify} className="flex gap-3">
          <input
            required
            value={tab === 'eco' ? certInput : memberInput}
            onChange={(e) => tab === 'eco' ? setCertInput(e.target.value) : setMemberInput(e.target.value)}
            placeholder={tab === 'eco' ? 'e.g. NACCIMA/CO/2026/000042' : 'e.g. NACCIMA-2026-0001'}
            className="flex-1 font-mono h-10 px-3 rounded-control border border-border-input bg-surface text-sm text-ink placeholder:text-ink-subtle/80 outline-none transition-[border-color,box-shadow] duration-150 hover:border-ink-subtle focus:border-primary focus:shadow-focus disabled:bg-surface-alt disabled:cursor-not-allowed"
          />
          <button type="submit" disabled={isLoading} className="flex items-center gap-2 disabled:opacity-50 h-10 px-4 text-sm rounded-control bg-primary text-white font-medium shadow-card transition-colors hover:bg-primary-hover focus-visible:shadow-focus disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? 'Verifying…' : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>search</span>Verify</>}
          </button>
        </form>
        {error && <div className="mt-4"><ErrorBanner message={error} /></div>}
      </div>

      {result && <VerificationResultCard result={result} onClear={() => setResult(null)} />}

      <div className="mt-6 rounded-card border border-border p-4 bg-surface-alt">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-ink-subtle flex-shrink-0 mt-0.5" style={{ fontSize: 18, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 18` }}>info</span>
          <div className="text-xs text-ink-subtle space-y-1">
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

  const allLogs = logs ?? [];
  const filtered = allLogs.filter((l) => {
    const matchType = typeFilter === 'all' || l.queryType === typeFilter;
    const matchResult = resultFilter === 'all' || l.result === resultFilter;
    return matchType && matchResult;
  });

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader title="Verification Audit Log" description="All eCO certificate and member ID verification queries from banks and institutions." />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { icon: 'verified', label: 'Total Queries', value: allLogs.length, accent: true },
          { icon: 'check_circle', label: 'Valid', value: allLogs.filter((l) => l.result === 'valid').length },
          { icon: 'schedule', label: 'Expired', value: allLogs.filter((l) => l.result === 'expired').length },
          { icon: 'search_off', label: 'Not Found', value: allLogs.filter((l) => l.result === 'not_found').length },
        ].map(({ icon, label, value }) => (
          <StatTile key={label} icon={icon} label={label} value={String(value)} />
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex flex-wrap items-center gap-1.5">
          {(['all', 'eco', 'member'] as const).map((t) => (
            <button key={t} onClick={() => setTypeFilter(t)} className={`h-7 px-2.5 rounded-full border text-xs font-medium whitespace-nowrap transition-colors focus-visible:shadow-focus capitalize ${typeFilter === t ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-surface text-ink-muted hover:border-border-strong hover:text-ink'}`}>
              {t === 'all' ? 'All Types' : t === 'eco' ? 'eCO Certs' : 'Member IDs'}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(['all', 'valid', 'expired', 'not_found'] as const).map((r) => (
            <button key={r} onClick={() => setResultFilter(r)} className={`h-7 px-2.5 rounded-full border text-xs font-medium whitespace-nowrap transition-colors focus-visible:shadow-focus capitalize ${resultFilter === r ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-surface text-ink-muted hover:border-border-strong hover:text-ink'}`}>
              {r.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <SkeletonCard /> : (
        <div className="bg-surface rounded-card border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table w-full text-sm">
              <thead>
                <tr>
                  {['Reference Queried', 'Type', 'Institution', 'Result', 'Date & Time'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => {
                  const rc = resultConfig[log.result];
                  return (
                    <tr key={log.id} className="hover:bg-surface-alt transition-colors">
                      <td className="font-mono text-sm text-ink">{log.queriedRef}</td>
                      <td>
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-2xs font-semibold uppercase" style={{ background: log.queryType === 'eco' ? 'rgb(var(--c-primary-soft))' : 'rgb(var(--c-success-bg))', color: log.queryType === 'eco' ? 'rgb(var(--c-primary))' : 'rgb(var(--c-success))' }}>
                          {log.queryType === 'eco' ? 'eCO' : 'Member'}
                        </span>
                      </td>
                      <td className="text-ink-subtle">{log.institutionName ?? log.queriedBy}</td>
                      <td>
                        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: rc.bg, color: rc.text }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 12` }}>{rc.icon}</span>
                          {rc.label}
                        </span>
                      </td>
                      <td className="text-xs text-ink-subtle">
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

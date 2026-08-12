import { Link } from 'react-router-dom';
import { useAppSelector } from '@shared/hooks/useAppDispatch';
import { useGetMemberProfileQuery } from '@features/dashboard/dashboardApi';
import { useGetEcoCertificatesQuery } from '@features/eco/ecoApi';
import { useGetAnalyticsSummaryQuery } from '@features/analytics/analyticsApi';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { isNoActiveChamberError } from '@shared/utils';

const ADMIN_ROLES = ['chamber_admin', 'super_admin', 'staff_operator'];
const EXECUTIVE_ROLE = 'chamber_executive';
const INSTITUTIONAL_ROLE = 'institutional_subscriber';

const memberStatusStyle: Record<string, { bg: string; text: string; label: string }> = {
  active:          { bg: 'bg-[#a0f4ca]', text: 'text-[#005137]', label: 'Active' },
  expired:         { bg: 'bg-[#ffdad6]', text: 'text-[#93000a]', label: 'Expired' },
  pending_payment: { bg: 'bg-[#ffdea5]', text: 'text-[#5d4201]', label: 'Pending Payment' },
  suspended:       { bg: 'bg-[#e0e3e5]', text: 'text-[#44474e]', label: 'Suspended' },
};

const ecoStatusStyle: Record<string, string> = {
  draft:              'bg-[#e0e3e5] text-[#44474e]',
  submitted:          'bg-[#d6e3ff] text-[#023293]',
  under_review:       'bg-[#ffdea5] text-[#5d4201]',
  pending_payment:    'bg-[#ffdea5] text-[#5d4201]',
  approved:           'bg-[#a0f4ca] text-[#002114]',
  issued:             'bg-[#a0f4ca] text-[#002114]',
  rejected:           'bg-[#ffdad6] text-[#93000a]',
  revision_requested: 'bg-[#ffdea5] text-[#5d4201]',
};

function StatCard({ icon, label, value, sub, accent }: { icon: string; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl p-5 border ${accent ? 'bg-[#023293] border-[#023293]' : 'bg-white border-[#e0e3e5]'}`}>
      <div className="flex items-start justify-between mb-3">
        <p className={`text-xs font-semibold uppercase tracking-wide ${accent ? 'text-[#aec7f7]' : 'text-[#74777f]'}`}>{label}</p>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: 20, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20`, color: accent ? '#aec7f7' : '#74777f' }}
        >
          {icon}
        </span>
      </div>
      <p className={`text-3xl font-bold ${accent ? 'text-white' : 'text-[#191c1e]'}`}>{value}</p>
      {sub && <p className={`text-xs mt-1 ${accent ? 'text-[#aec7f7]' : 'text-[#74777f]'}`}>{sub}</p>}
    </div>
  );
}

function AdminOverview() {
  const { data: stats, isLoading, isError, refetch } = useGetAnalyticsSummaryQuery();

  const growth = stats && stats.revenueLastMonth > 0
    ? (((stats.revenueThisMonth - stats.revenueLastMonth) / stats.revenueLastMonth) * 100).toFixed(1)
    : null;

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#191c1e]">Chamber Overview</h2>
        <p className="text-sm text-[#74777f] mt-0.5">Key metrics across all modules.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : isError || !stats ? (
        <div className="rounded-xl border border-[#ffdad6] bg-[#fff8f7] p-5 flex items-center justify-between mb-6">
          <p className="text-sm text-[#93000a]">Failed to load chamber metrics.</p>
          <button onClick={refetch} className="text-sm text-[#023293] hover:underline">Retry</button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatCard icon="group" label="Total Members" value={stats.totalMembers.toLocaleString()} sub={`${stats.activeMembers.toLocaleString()} active`} accent />
            <StatCard icon="payments" label="Revenue This Month" value={`₦${(stats.revenueThisMonth / 1_000_000).toFixed(1)}M`} sub={growth ? `${Number(growth) >= 0 ? '+' : ''}${growth}% vs last month` : 'No revenue last month'} />
            <StatCard icon="description" label="Certificates Issued" value={stats.ecoCertificatesIssued.toLocaleString()} sub="All time" />
            <StatCard icon="person_add" label="New This Month" value={`+${stats.newMembersThisMonth}`} sub="New registrations" />
          </div>

          {/* Quick links row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Manage Members', sub: 'View and manage all members', to: '/dashboard/admin', icon: 'manage_accounts' },
              { label: 'eCO Queue', sub: 'Review pending applications', to: '/dashboard/eco', icon: 'task_alt' },
              { label: 'Full Analytics', sub: 'Detailed charts and reports', to: '/dashboard/analytics', icon: 'bar_chart' },
            ].map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="flex items-center gap-4 bg-white rounded-xl border border-[#e0e3e5] p-4 hover:border-[#023293]/30 hover:shadow-sm transition-all"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#d6e3ff' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: `'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 20`, color: '#023293' }}>{a.icon}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#191c1e]">{a.label}</p>
                  <p className="text-xs text-[#74777f]">{a.sub}</p>
                </div>
                <span className="material-symbols-outlined ml-auto text-[#74777f]" style={{ fontSize: 18 }}>chevron_right</span>
              </Link>
            ))}
          </div>

          {/* Membership breakdown */}
          <div className="bg-white rounded-xl border border-[#e0e3e5] p-6">
            <h3 className="text-sm font-semibold text-[#191c1e] mb-4">Membership Status Breakdown</h3>
            {stats.totalMembers === 0 ? (
              <p className="text-sm text-[#74777f]">No members yet.</p>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'Active', count: stats.activeMembers, color: '#0b6c4b' },
                  { label: 'Pending Renewal', count: stats.pendingRenewals, color: '#c5a059' },
                  { label: 'Inactive / Expired', count: stats.totalMembers - stats.activeMembers - stats.pendingRenewals, color: '#c4c6cf' },
                ].map((row) => {
                  const pct = ((row.count / stats.totalMembers) * 100).toFixed(1);
                  return (
                    <div key={row.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[#191c1e] font-medium">{row.label}</span>
                        <span className="text-[#74777f]">{row.count.toLocaleString()} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-[#e0e3e5] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: row.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MemberOverview() {
  const user = useAppSelector((s) => s.auth.user);
  const { data: profile, isLoading: profileLoading, isError: profileError, error: profileErrorObj, refetch } = useGetMemberProfileQuery();
  const { data: certificates, isLoading: ecoLoading } = useGetEcoCertificatesQuery();
  const noChamberConnection = isNoActiveChamberError(profileErrorObj);

  const pendingEco = certificates?.filter((c) =>
    ['submitted', 'under_review', 'pending_payment'].includes(c.status)
  ).length ?? 0;
  const issuedEco = certificates?.filter((c) => c.status === 'issued').length ?? 0;
  const memberStatus = profile?.status ?? 'pending_payment';
  const statusStyle = memberStatusStyle[memberStatus] ?? memberStatusStyle.pending_payment;

  return (
    <div className="p-6 max-w-6xl">
      {/* Welcome */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#191c1e]">
          Welcome back, {user?.firstName ?? 'Member'}!
        </h2>
        <p className="text-sm text-[#74777f] mt-0.5">
          Manage your certificates, track exports, and access trade services.
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Link
          to="/dashboard/eco/apply"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:opacity-90"
          style={{ background: '#023293' }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: `'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 16` }}>add</span>
          New eCO Certificate
        </Link>
        <Link
          to="/dashboard/membership"
          className="inline-flex items-center gap-2 rounded-lg border border-[#c4c6cf] bg-white px-4 py-2 text-sm font-medium text-[#191c1e] hover:border-[#023293] hover:text-[#023293] transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 16` }}>verified_user</span>
          Renew Membership
        </Link>
        <Link
          to="/dashboard/documents"
          className="inline-flex items-center gap-2 rounded-lg border border-[#c4c6cf] bg-white px-4 py-2 text-sm font-medium text-[#191c1e] hover:border-[#023293] hover:text-[#023293] transition-colors"
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 16` }}>folder_open</span>
          Documents
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Membership card */}
        {profileLoading ? (
          <SkeletonCard className="h-28" />
        ) : noChamberConnection ? (
          <div className="bg-white rounded-xl border border-dashed border-[#c4c6cf] p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#74777f] mb-2">Membership</p>
            <p className="text-sm text-[#191c1e] mb-2">You&apos;re not connected to a chamber yet.</p>
            <Link to="/dashboard/connections" className="text-xs font-medium text-[#023293] hover:underline">
              Connect a chamber
            </Link>
          </div>
        ) : profileError ? (
          <div className="rounded-xl border border-[#ffdad6] bg-[#fff8f7] p-5 flex items-center justify-between">
            <p className="text-sm text-[#93000a]">Failed to load membership status.</p>
            <button onClick={refetch} className="text-sm text-[#023293] hover:underline">Retry</button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#e0e3e5] p-5">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#74777f]">Membership</p>
              <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20`, color: '#74777f' }}>verified_user</span>
            </div>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
              {statusStyle.label}
            </span>
            {profile?.memberId && <p className="text-xs text-[#74777f] mt-2">ID: {profile.memberId}</p>}
            {profile?.membershipExpiresAt && (
              <p className="text-xs text-[#74777f] mt-0.5">
                Expires: {new Date(profile.membershipExpiresAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' })}
              </p>
            )}
          </div>
        )}

        {/* Pending eCO */}
        <div className="bg-white rounded-xl border border-[#e0e3e5] p-5">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#74777f]">Pending Applications</p>
            <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20`, color: '#74777f' }}>pending_actions</span>
          </div>
          {ecoLoading ? <SkeletonCard className="h-8 w-12" /> : (
            <>
              <p className="text-3xl font-bold text-[#191c1e]">{String(pendingEco).padStart(2, '0')}</p>
              <p className="text-xs text-[#74777f] mt-1">Avg. turnaround: 24h</p>
            </>
          )}
        </div>

        {/* Issued certificates */}
        <div className="rounded-xl border border-[#023293] p-5" style={{ background: '#023293' }}>
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#aec7f7]">Certificates Issued</p>
            <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20`, color: '#aec7f7' }}>verified</span>
          </div>
          {ecoLoading ? <SkeletonCard className="h-8 w-12" /> : (
            <>
              <p className="text-3xl font-bold text-white">{issuedEco}</p>
              <p className="text-xs text-[#aec7f7] mt-1">{certificates?.length ?? 0} total applications</p>
            </>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent eCO table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#e0e3e5] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#e0e3e5] flex justify-between items-center">
            <h3 className="text-sm font-semibold text-[#191c1e]">Recent eCO Certificates</h3>
            <Link to="/dashboard/eco" className="text-xs font-medium text-[#023293] hover:underline">View all</Link>
          </div>
          {ecoLoading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => <SkeletonCard key={i} className="h-10" />)}
            </div>
          ) : !certificates || certificates.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-[#74777f]">No certificates yet.</p>
              <Link to="/dashboard/eco/apply" className="mt-2 inline-block text-sm text-[#023293] hover:underline font-medium">
                Apply for your first eCO
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#f7f9fb] border-b border-[#e0e3e5]">
                    <th className="px-5 py-3 text-xs font-semibold text-[#74777f] uppercase tracking-wide">Reference</th>
                    <th className="px-5 py-3 text-xs font-semibold text-[#74777f] uppercase tracking-wide">Destination</th>
                    <th className="px-5 py-3 text-xs font-semibold text-[#74777f] uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold text-[#74777f] uppercase tracking-wide">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f2f4]">
                  {certificates.slice(0, 5).map((cert) => (
                    <tr key={cert.id} className="hover:bg-[#f7f9fb] transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-[#191c1e]">{cert.certificateNumber ?? cert.id.slice(0, 12).toUpperCase()}</p>
                        <p className="text-xs text-[#74777f] truncate max-w-[160px]">{cert.cargoDescription}</p>
                      </td>
                      <td className="px-5 py-3 text-[#191c1e]">{cert.destinationCountry}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ecoStatusStyle[cert.status] ?? 'bg-[#e0e3e5] text-[#44474e]'}`}>
                          {cert.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[#74777f]">
                        {new Date(cert.createdAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick actions panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#e0e3e5] p-5">
            <h3 className="text-sm font-semibold text-[#191c1e] mb-3">Quick Actions</h3>
            <div className="space-y-1.5">
              {[
                { label: 'Apply for eCO Certificate', to: '/dashboard/eco/apply', icon: 'description' },
                { label: 'View Trade Documents', to: '/dashboard/documents', icon: 'folder_open' },
                { label: 'Browse Trade Fair', to: '/dashboard/trade-fair', icon: 'storefront' },
                { label: 'NACCIMA Academy', to: '/dashboard/academy', icon: 'school' },
              ].map((a) => (
                <Link
                  key={a.to}
                  to={a.to}
                  className="flex items-center justify-between w-full rounded-lg border border-[#e0e3e5] px-3 py-2.5 text-sm text-[#191c1e] hover:bg-[#023293] hover:text-white hover:border-[#023293] transition-colors group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined group-hover:text-white text-[#74777f]" style={{ fontSize: 16, fontVariationSettings: `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 16` }}>{a.icon}</span>
                    <span>{a.label}</span>
                  </div>
                  <span className="material-symbols-outlined text-[#74777f] group-hover:text-white/70" style={{ fontSize: 16 }}>chevron_right</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Export Intelligence card */}
          <div className="rounded-xl p-5 text-white" style={{ background: '#0b6c4b' }}>
            <h3 className="text-sm font-semibold mb-2">Export Intelligence</h3>
            <p className="text-xs text-white/80 mb-4">
              New trade tariff reports available for ECOWAS region. Access the latest market data.
            </p>
            <Link
              to="/dashboard/eco"
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/30 transition-colors"
            >
              View eCO Certificates
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExecutiveOverview() {
  const { data: stats, isLoading, isError, refetch } = useGetAnalyticsSummaryQuery();
  const growth = stats && stats.revenueLastMonth > 0
    ? (((stats.revenueThisMonth - stats.revenueLastMonth) / stats.revenueLastMonth) * 100).toFixed(1)
    : null;

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6 flex items-center gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[#191c1e]">Executive Overview</h2>
          <p className="text-sm text-[#74777f] mt-0.5">Read-only analytics view.</p>
        </div>
        <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-medium text-blue-700">
          Read-only
        </span>
      </div>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : isError || !stats ? (
        <div className="rounded-xl border border-[#ffdad6] bg-[#fff8f7] p-5 flex items-center justify-between mb-6">
          <p className="text-sm text-[#93000a]">Failed to load chamber metrics.</p>
          <button onClick={refetch} className="text-sm text-[#023293] hover:underline">Retry</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatCard icon="group" label="Total Members" value={stats.totalMembers.toLocaleString()} sub={`${stats.activeMembers.toLocaleString()} active`} accent />
          <StatCard icon="payments" label="Revenue This Month" value={`₦${(stats.revenueThisMonth / 1_000_000).toFixed(1)}M`} sub={growth ? `${Number(growth) >= 0 ? '+' : ''}${growth}% vs last month` : 'No revenue last month'} />
          <StatCard icon="description" label="Certificates Issued" value={stats.ecoCertificatesIssued.toLocaleString()} sub="All time" />
          <StatCard icon="person_add" label="New This Month" value={`+${stats.newMembersThisMonth}`} sub="New registrations" />
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: 'Full Analytics', sub: 'Detailed charts and reports', to: '/dashboard/analytics', icon: 'bar_chart' },
          { label: 'Member Directory', sub: 'View all registered members', to: '/dashboard/admin', icon: 'group' },
        ].map((a) => (
          <Link key={a.to} to={a.to} className="flex items-center gap-4 bg-white rounded-xl border border-[#e0e3e5] p-4 hover:border-[#023293]/30 hover:shadow-sm transition-all">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#d6e3ff' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: `'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 20`, color: '#023293' }}>{a.icon}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#191c1e]">{a.label}</p>
              <p className="text-xs text-[#74777f]">{a.sub}</p>
            </div>
            <span className="material-symbols-outlined ml-auto text-[#74777f]" style={{ fontSize: 18 }}>chevron_right</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function InstitutionalOverview() {
  const user = useAppSelector((s) => s.auth.user);
  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[#191c1e]">Welcome, {user?.firstName ?? 'Institution'}!</h2>
        <p className="text-sm text-[#74777f] mt-0.5">Access verification services and trade intelligence.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: 'Bank Verification', sub: 'Verify exporters and trade documents', to: '/dashboard/bank-verification', icon: 'verified' },
          { label: 'Exporter Visibility', sub: 'Search active NACCIMA exporters', to: '/dashboard/exporter-visibility', icon: 'visibility' },
          { label: 'Trade Corridors', sub: 'Browse active trade routes', to: '/dashboard/trade-corridors', icon: 'route' },
          { label: 'Trade Data API', sub: 'Access live trade intelligence feeds', to: '/dashboard/trade-data-api', icon: 'api' },
        ].map((a) => (
          <Link key={a.to} to={a.to} className="flex items-center gap-4 bg-white rounded-xl border border-[#e0e3e5] p-5 hover:border-[#023293]/30 hover:shadow-sm transition-all">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#d6e3ff' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: `'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 20`, color: '#023293' }}>{a.icon}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#191c1e]">{a.label}</p>
              <p className="text-xs text-[#74777f]">{a.sub}</p>
            </div>
            <span className="material-symbols-outlined ml-auto text-[#74777f]" style={{ fontSize: 18 }}>chevron_right</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function OverviewPage() {
  const role = useAppSelector((s) => s.auth.role);
  if (role === EXECUTIVE_ROLE) return <ExecutiveOverview />;
  if (role === INSTITUTIONAL_ROLE) return <InstitutionalOverview />;
  if (role && ADMIN_ROLES.includes(role)) return <AdminOverview />;
  return <MemberOverview />;
}

import { useGetAnalyticsSummaryQuery } from '@features/analytics/analyticsApi';
import { SkeletonCard } from '@shared/ui/SkeletonCard';

const demoData = {
  totalMembers: 4821, activeMembers: 3964, pendingRenewals: 412,
  ecoCertificatesIssued: 1243, revenueThisMonth: 18750000,
  revenueLastMonth: 15200000, newMembersThisMonth: 87, tradeFairRegistrations: 234,
};

function StatCard({ label, value, sublabel, accent }: { label: string; value: string; sublabel?: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${accent ? 'border-[#023293] text-white' : 'bg-white border-[#e0e3e5]'}`} style={accent ? { background: '#023293' } : {}}>
      <p className={`text-sm mb-1 ${accent ? 'text-[#aec7f7]' : 'text-[#74777f]'}`}>{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-white' : 'text-[#191c1e]'}`}>{value}</p>
      {sublabel && <p className={`text-xs mt-1 ${accent ? 'text-[#aec7f7]' : 'text-[#74777f]'}`}>{sublabel}</p>}
    </div>
  );
}

export function AnalyticsPage() {
  const { data, isLoading } = useGetAnalyticsSummaryQuery();
  const stats = data ?? demoData;

  const revenueGrowth = ((stats.revenueThisMonth - stats.revenueLastMonth) / stats.revenueLastMonth * 100).toFixed(1);
  const isGrowthPositive = stats.revenueThisMonth >= stats.revenueLastMonth;

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-xl font-semibold text-[#191c1e] mb-1">Analytics Hub</h1>
      <p className="text-sm text-[#74777f] mb-6">Chamber performance metrics and key indicators.</p>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          <p className="text-xs font-semibold text-[#74777f] uppercase tracking-wide mb-3">Membership</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatCard label="Total Members" value={stats.totalMembers.toLocaleString()} accent />
            <StatCard label="Active Members" value={stats.activeMembers.toLocaleString()} sublabel={`${((stats.activeMembers / stats.totalMembers) * 100).toFixed(0)}% active rate`} />
            <StatCard label="Pending Renewals" value={stats.pendingRenewals.toLocaleString()} sublabel="Require follow-up" />
            <StatCard label="New This Month" value={`+${stats.newMembersThisMonth}`} sublabel="New registrations" />
          </div>

          <p className="text-xs font-semibold text-[#74777f] uppercase tracking-wide mb-3">Revenue</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
            <StatCard
              label="Revenue This Month"
              value={`₦${(stats.revenueThisMonth / 1000000).toFixed(1)}M`}
              sublabel={`${isGrowthPositive ? '+' : ''}${revenueGrowth}% vs last month`}
              accent
            />
            <StatCard label="Revenue Last Month" value={`₦${(stats.revenueLastMonth / 1000000).toFixed(1)}M`} />
            <StatCard label="eCO Certificates Issued" value={stats.ecoCertificatesIssued.toLocaleString()} sublabel="All time" />
          </div>

          <p className="text-xs font-semibold text-[#74777f] uppercase tracking-wide mb-3">Events</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
            <StatCard label="Trade Fair Registrations" value={stats.tradeFairRegistrations.toLocaleString()} sublabel="Current event" accent />
          </div>

          <div className="bg-white rounded-xl border border-[#e0e3e5] p-6">
            <h3 className="text-sm font-semibold text-[#191c1e] mb-4">Membership Status Breakdown</h3>
            <div className="space-y-3">
              {[
                { label: 'Active', count: stats.activeMembers, total: stats.totalMembers, color: '#0b6c4b' },
                { label: 'Pending Renewal', count: stats.pendingRenewals, total: stats.totalMembers, color: '#c5a059' },
                { label: 'Inactive / Expired', count: stats.totalMembers - stats.activeMembers - stats.pendingRenewals, total: stats.totalMembers, color: '#c4c6cf' },
              ].map((row) => {
                const pct = ((row.count / row.total) * 100).toFixed(1);
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
          </div>
        </>
      )}
    </div>
  );
}

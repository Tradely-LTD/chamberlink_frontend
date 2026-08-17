import { useGetAnalyticsSummaryQuery, useGetAnalyticsTrendsQuery } from '@features/analytics/analyticsApi';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { StatTile } from '@shared/ui/StatTile';
import { Card, CardTitle } from '@shared/ui/Card';
import { RevenueTrendChart } from '@features/analytics/components/RevenueTrendChart';
import { MembershipTrendChart } from '@features/analytics/components/MembershipTrendChart';
import { MembershipStatusBar } from '@features/analytics/components/MembershipStatusBar';

const demoData = {
  totalMembers: 4821, activeMembers: 3964, pendingRenewals: 412,
  ecoCertificatesIssued: 1243, revenueThisMonth: 18750000,
  revenueLastMonth: 15200000, newMembersThisMonth: 87, tradeFairRegistrations: 234,
};

const sectionLabelClass = 'text-xs font-semibold text-ink-subtle uppercase tracking-wide mb-3';

export function AnalyticsPage() {
  const { data, isLoading } = useGetAnalyticsSummaryQuery();
  const { data: trends, isLoading: trendsLoading } = useGetAnalyticsTrendsQuery(6);
  const stats = data ?? demoData;

  const revenueGrowth = ((stats.revenueThisMonth - stats.revenueLastMonth) / stats.revenueLastMonth * 100).toFixed(1);
  const isGrowthPositive = stats.revenueThisMonth >= stats.revenueLastMonth;

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-xl font-semibold text-ink mb-1">Analytics Hub</h1>
      <p className="text-sm text-ink-subtle mb-6">Chamber performance metrics and key indicators.</p>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <>
          <p className={sectionLabelClass}>Membership</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatTile icon="group" label="Total Members" value={stats.totalMembers.toLocaleString()} accent />
            <StatTile icon="verified_user" label="Active Members" value={stats.activeMembers.toLocaleString()} sublabel={`${((stats.activeMembers / stats.totalMembers) * 100).toFixed(0)}% active rate`} />
            <StatTile icon="pending_actions" label="Pending Renewals" value={stats.pendingRenewals.toLocaleString()} sublabel="Require follow-up" />
            <StatTile icon="person_add" label="New This Month" value={`+${stats.newMembersThisMonth}`} sublabel="New registrations" />
          </div>

          <p className={sectionLabelClass}>Revenue</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
            <StatTile
              icon="payments"
              label="Revenue This Month"
              value={`₦${(stats.revenueThisMonth / 1000000).toFixed(1)}M`}
              sublabel={`${isGrowthPositive ? '+' : ''}${revenueGrowth}% vs last month`}
              accent
            />
            <StatTile icon="calendar_month" label="Revenue Last Month" value={`₦${(stats.revenueLastMonth / 1000000).toFixed(1)}M`} />
            <StatTile icon="description" label="eCO Certificates Issued" value={stats.ecoCertificatesIssued.toLocaleString()} sublabel="All time" />
          </div>

          <p className={sectionLabelClass}>Events</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
            <StatTile icon="storefront" label="Trade Fair Registrations" value={stats.tradeFairRegistrations.toLocaleString()} sublabel="Current event" accent />
          </div>

          <p className={sectionLabelClass}>Trends (last 6 months)</p>
          <div className="grid gap-4 lg:grid-cols-2 mb-6">
            <Card>
              <CardTitle>Revenue</CardTitle>
              {trendsLoading ? <SkeletonCard className="h-56 mt-2" /> : <RevenueTrendChart data={trends ?? []} />}
            </Card>
            <Card>
              <CardTitle>Members & Certificates</CardTitle>
              {trendsLoading ? <SkeletonCard className="h-56 mt-2" /> : <MembershipTrendChart data={trends ?? []} />}
            </Card>
          </div>

          <Card>
            <CardTitle>Membership Status Breakdown</CardTitle>
            <div className="mt-4">
              <MembershipStatusBar
                totalMembers={stats.totalMembers}
                activeMembers={stats.activeMembers}
                pendingRenewals={stats.pendingRenewals}
              />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

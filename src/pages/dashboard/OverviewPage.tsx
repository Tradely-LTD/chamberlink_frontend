import { Link } from 'react-router-dom';
import { useAppSelector } from '@shared/hooks/useAppDispatch';
import { useGetMemberProfileQuery } from '@features/dashboard/dashboardApi';
import { useGetEcoCertificatesQuery, useGetCertificateTypesQuery, useGetFeeRatesQuery, formatRatePct } from '@features/eco/ecoApi';
import type { CertificateTypeOption } from '@features/eco/ecoApi';
import { useGetAnalyticsSummaryQuery, useGetAnalyticsTrendsQuery, useGetAnalyticsGeoQuery } from '@features/analytics/analyticsApi';
import { ExportFootprint } from '@features/analytics/components/geo/ExportFootprint';
import { geoFromCertificates } from '@features/analytics/components/geo/geoFromCertificates';
import { useHasChamberConnection } from '@features/membership';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { StatTile } from '@shared/ui/StatTile';
import { Card, CardTitle, CardDescription } from '@shared/ui/Card';
import { PageHeader } from '@shared/ui/PageHeader';
import { SectionLabel } from '@shared/ui/SectionLabel';
import { Status, StatusBadge } from '@shared/ui/StatusBadge';
import { TableCard } from '@shared/ui/TableCard';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { MembershipStatusBar } from '@features/analytics/components/MembershipStatusBar';
import { isNoActiveChamberError } from '@shared/utils';

const ADMIN_ROLES = ['chamber_admin', 'super_admin', 'staff_operator'];
const EXECUTIVE_ROLE = 'chamber_executive';
const INSTITUTIONAL_ROLE = 'institutional_subscriber';

const btnPrimary =
  'inline-flex h-10 items-center gap-2 rounded-control bg-primary px-4 text-sm font-medium text-white shadow-card transition-colors hover:bg-primary-hover focus-visible:shadow-focus';

interface Shortcut { label: string; sub: string; to: string; icon: string }

/** A destination card: icon, title, one line of context, chevron. */
function ShortcutGrid({ items, cols = 3 }: { items: Shortcut[]; cols?: 2 | 3 }) {
  return (
    <ul className={`grid grid-cols-1 gap-3 ${cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
      {items.map((a) => (
        <li key={a.to}>
          <Link
            to={a.to}
            className="group flex h-full items-center gap-4 rounded-card border border-border bg-surface p-4 transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-card-hover focus-visible:shadow-focus"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-control bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-white">
              <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 20 }}>{a.icon}</span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-ink">{a.label}</span>
              <span className="block text-[13px] text-ink-subtle">{a.sub}</span>
            </span>
            <span className="material-symbols-outlined text-ink-subtle transition-transform group-hover:translate-x-0.5" aria-hidden="true" style={{ fontSize: 18 }}>chevron_right</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function MetricsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} className="h-[118px]" />)}
    </div>
  );
}

function AdminOverview() {
  const role = useAppSelector((s) => s.auth.role);
  const isPlatform = role === 'super_admin';
  const { data: stats, isLoading, isError, refetch } = useGetAnalyticsSummaryQuery();
  const { data: trends } = useGetAnalyticsTrendsQuery(6);
  const { data: geo, isLoading: geoLoading, isError: geoError, refetch: refetchGeo } = useGetAnalyticsGeoQuery();

  const growth = stats && stats.revenueLastMonth > 0
    ? (((stats.revenueThisMonth - stats.revenueLastMonth) / stats.revenueLastMonth) * 100).toFixed(1)
    : null;
  const revenueSparkline = trends?.map((t) => t.revenue);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader
        eyebrow={isPlatform ? 'Super admin' : role === 'staff_operator' ? 'Staff console' : 'Chamber admin'}
        title={isPlatform ? 'Platform overview' : 'Chamber overview'}
        description={isPlatform ? 'Certificates, members and revenue across every onboarded chamber.' : 'Certificates, members and revenue for your chamber.'}
        actions={<Link to="/dashboard/eco" className={btnPrimary}><span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>task_alt</span>Open certificate queue</Link>}
      />

      {isLoading ? (
        <MetricsSkeleton />
      ) : isError || !stats ? (
        <div className="mb-6"><ErrorBanner message="Couldn't load the overview metrics." onRetry={refetch} /></div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatTile icon="group" label="Total Members" value={stats.totalMembers.toLocaleString()} sublabel={`${stats.activeMembers.toLocaleString()} active`} accent />
            <StatTile
              icon="payments"
              label="Revenue This Month"
              value={`₦${(stats.revenueThisMonth / 1_000_000).toFixed(1)}M`}
              sublabel={growth ? `${Number(growth) >= 0 ? '+' : ''}${growth}% vs last month` : 'No revenue last month'}
              sparkline={revenueSparkline}
            />
            <StatTile icon="description" label="Certificates Issued" value={stats.ecoCertificatesIssued.toLocaleString()} sublabel="All time" />
            <StatTile icon="person_add" label="New This Month" value={`+${stats.newMembersThisMonth}`} sublabel="New registrations" />
          </div>

          <div className="mb-6">
            <ShortcutGrid items={[
              { label: 'Member management', sub: 'Members, tiers and renewals', to: '/dashboard/members', icon: 'manage_accounts' },
              { label: 'Certificate queue', sub: 'Review and approve applications', to: '/dashboard/eco', icon: 'task_alt' },
              { label: 'Analytics', sub: 'Trends, revenue and reports', to: '/dashboard/analytics', icon: 'bar_chart' },
            ]} />
          </div>

          <div className="mb-6">
            <ExportFootprint
              title={isPlatform ? 'Export activity across Nigeria' : 'Your chamber\'s export activity'}
              subtitle="Submitted certificate applications by destination, state of origin and goods."
              geo={geo}
              isLoading={geoLoading}
              isError={geoError}
              onRetry={refetchGeo}
              empty={<p className="text-sm text-ink-muted text-center">No certificate applications yet. The map fills in as exporters apply.</p>}
            />
          </div>

          {/* Membership breakdown */}
          <Card>
            <CardTitle>Membership status</CardTitle>
            <CardDescription>Active members against renewals still to be paid.</CardDescription>
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

// Cosmetic only — the form itself keys off goodsSource/requiresMiningLicence,
// never the code, so a type NACCIMA adds later simply gets the default icon.
const certIcon = (t: CertificateTypeOption) =>
  t.requiresMiningLicence ? 'diamond'
    : ({ 'naccima-certificate-of-origin': 'verified', gsp: 'percent', 'ecowas-free-trade': 'handshake', 'movement-certificate': 'local_shipping', 'china-zero-tariff': 'public' } as Record<string, string>)[t.slug]
      ?? 'description';

// Member vs non-member rates (RFP §4.1.9) come from GET /eco/fee-rates — the
// same source the apply form uses — as percentages of invoice value.
const EXAMPLE_INVOICE = 100_000_000;
const naira = (n: number) => `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;

const IN_REVIEW: string[] = ['submitted', 'under_review', 'revision_requested'];
const TO_PAY: string[] = ['approved', 'pending_payment'];

function MemberOverview() {
  const user = useAppSelector((s) => s.auth.user);
  const { data: profile, isLoading: profileLoading, isError: profileError, error: profileErrorObj, refetch } = useGetMemberProfileQuery();
  const { data: certificates, isLoading: ecoLoading, isError: ecoError, refetch: refetchEco } = useGetEcoCertificatesQuery();
  const { data: certificateTypes, isLoading: typesLoading } = useGetCertificateTypesQuery();
  const { hasConnection } = useHasChamberConnection();
  const { data: feeRates } = useGetFeeRatesQuery();
  const payFirst = feeRates?.paymentOrder === 'pay_first';
  const noChamberConnection = isNoActiveChamberError(profileErrorObj);

  const drafts = certificates?.filter((c) => c.status === 'draft').length ?? 0;
  const inReview = certificates?.filter((c) => IN_REVIEW.includes(c.status)).length ?? 0;
  const toPay = certificates?.filter((c) => TO_PAY.includes(c.status)).length ?? 0;
  const issued = certificates?.filter((c) => c.status === 'issued').length ?? 0;
  const needsRenewal = profile?.status === 'expired' || profile?.status === 'pending_payment';
  const geo = geoFromCertificates(certificates);

  const quickLinks = [
    { label: 'My certificate applications', to: '/dashboard/eco', icon: 'description', gated: false },
    { label: 'My company (TIN)', to: '/dashboard/company', icon: 'domain', gated: false },
    { label: 'Trade documents', to: '/dashboard/documents', icon: 'folder_open', gated: true },
    { label: 'E-Learning', to: '/dashboard/academy', icon: 'school', gated: true },
  ].filter((l) => !l.gated || hasConnection);

  const pipeline = [
    { label: 'Drafts', value: drafts, sub: 'Saved, not submitted', icon: 'edit_note' },
    { label: 'In review', value: inReview, sub: 'With the chamber', icon: 'pending_actions' },
    { label: 'Ready to pay', value: toPay, sub: payFirst ? 'Pay to send for review' : 'Approved, pay to issue', icon: 'payments', emphasis: toPay > 0 },
    { label: 'Issued', value: issued, sub: `${certificates?.length ?? 0} applications in total`, icon: 'verified' },
  ];

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8">
      {/* Why you're here: one platform account, five certificates. */}
      <PageHeader
        eyebrow="Exporter workspace"
        title={`Welcome, ${user?.firstName ?? 'Exporter'}`}
        description={payFirst
          ? 'Apply for an export certificate, pay online when you submit, and download it once the chamber approves it, with or without a chamber membership.'
          : 'Apply for an export certificate, pay online once it\u2019s approved, and download it, with or without a chamber membership.'}
        actions={<Link to="/dashboard/eco/apply" className={btnPrimary}><span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 18 }}>add</span>New application</Link>}
      />

      <section aria-labelledby="certs-title" className="mb-8">
        <div className="flex items-baseline justify-between mb-3">
          <SectionLabel as="h2"><span id="certs-title">Apply for a certificate</span></SectionLabel>
          <Link to="/dashboard/eco" className="text-[13px] font-medium text-primary hover:underline underline-offset-2">My applications</Link>
        </div>
        {typesLoading ? (
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} className="h-40" />)}
          </div>
        ) : (
          <ul className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
            {(certificateTypes ?? []).map((t) => (
              <li key={t.code}>
                <Link
                  to={`/dashboard/eco/apply?type=${encodeURIComponent(t.code)}`}
                  className="group flex h-full flex-col rounded-card border border-border bg-surface p-4 transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-card-hover focus-visible:shadow-focus"
                >
                  <span className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-control bg-primary-soft text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 19 }}>{certIcon(t)}</span>
                  </span>
                  <span className="text-[14px] font-semibold leading-snug text-ink">{t.name}</span>
                  {t.description && <span className="mt-1.5 text-[13px] leading-relaxed text-ink-muted line-clamp-3">{t.description}</span>}
                  <span className="mt-auto pt-4 inline-flex items-center gap-1 text-[13px] font-medium text-primary">
                    Start application
                    <span className="material-symbols-outlined transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" style={{ fontSize: 16 }}>arrow_forward</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Where your applications stand — one strip, read left to right. */}
      <section aria-label="Application pipeline" className="mb-8 grid grid-cols-2 overflow-hidden rounded-card border border-border bg-surface lg:grid-cols-4">
        {pipeline.map((t, idx) => (
          <Link
            key={t.label}
            to="/dashboard/eco"
            className={`relative flex flex-col gap-1 p-5 transition-colors hover:bg-surface-alt focus-visible:shadow-focus ${idx > 0 ? 'border-l border-border' : ''} ${idx === 2 ? 'max-lg:border-l-0' : ''} ${idx > 1 ? 'max-lg:border-t' : ''} ${t.emphasis ? 'bg-gold-soft/60' : ''}`}
          >
            <span className="flex items-center gap-1.5">
              <span className={`material-symbols-outlined ${t.emphasis ? 'text-gold' : 'text-ink-subtle'}`} aria-hidden="true" style={{ fontSize: 16 }}>{t.icon}</span>
              <span className={`text-2xs font-semibold uppercase ${t.emphasis ? 'text-gold' : 'text-ink-subtle'}`}>{t.label}</span>
            </span>
            {ecoLoading ? <SkeletonCard className="mt-1 h-7 w-10 min-h-0" /> : (
              <span className="num text-[28px] font-semibold leading-none text-ink mt-1">{t.value}</span>
            )}
            <span className="text-xs text-ink-subtle">{t.sub}</span>
          </Link>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Recent applications */}
        <TableCard
          className="lg:col-span-2"
          title="Recent applications"
          actions={<Link to="/dashboard/eco" className="text-[13px] font-medium text-primary hover:underline underline-offset-2">View all</Link>}
        >
          {ecoLoading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => <SkeletonCard key={i} className="h-10 min-h-0" />)}
            </div>
          ) : ecoError ? (
            <div className="p-5"><ErrorBanner message="Couldn't load your applications." onRetry={refetchEco} /></div>
          ) : !certificates || certificates.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13px] text-ink-muted">No applications yet. Pick a certificate above to start one.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th scope="col">Reference</th><th scope="col">Destination</th><th scope="col">Status</th><th scope="col" className="text-right">Submitted</th></tr>
              </thead>
              <tbody>
                {certificates.slice(0, 5).map((cert) => (
                  <tr key={cert.id}>
                    <td>
                      <Link to={`/dashboard/eco/${cert.id}`} className="font-mono text-[12.5px] font-medium text-ink hover:text-primary">
                        {cert.certificateNumber ?? cert.id.slice(0, 12).toUpperCase()}
                      </Link>
                      <p className="text-xs text-ink-subtle truncate max-w-[220px]">
                        {certificateTypes?.find((t) => t.code === cert.certificateTypeCode)?.name ?? cert.solidMineralName ?? '–'}
                      </p>
                    </td>
                    <td className="whitespace-nowrap">{cert.destinationCountry ?? '–'}</td>
                    <td><Status status={cert.status} /></td>
                    <td className="num whitespace-nowrap text-right text-ink-subtle">
                      {new Date(cert.createdAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TableCard>

        <div className="space-y-6">
          {/* Membership — an incentive when there is none, a status when there is. */}
          {profileLoading || (noChamberConnection && !feeRates) ? (
            <SkeletonCard className="h-52" />
          ) : noChamberConnection && feeRates ? (
            <section className="rounded-card border border-gold-light/30 bg-surface p-5 relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-[3px] bg-gold-light" aria-hidden="true" />
              <SectionLabel className="text-gold">Chamber membership</SectionLabel>
              <h3 className="mt-1.5 text-[15px] font-semibold leading-snug text-ink">Members pay less on every certificate</h3>
              <dl className="mt-4 grid grid-cols-2 overflow-hidden rounded-control border border-border text-center">
                <div className="px-3 py-2.5">
                  <dt className="text-xs text-ink-subtle">Non-member</dt>
                  <dd className="num text-[15px] font-semibold text-ink">{formatRatePct(feeRates.nonMemberRatePct)}</dd>
                </div>
                <div className="border-l border-border bg-success-bg px-3 py-2.5">
                  <dt className="text-xs font-medium text-success">Member</dt>
                  <dd className="num text-[15px] font-semibold text-success">{formatRatePct(feeRates.memberRatePct)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
                of invoice value. On a {naira(EXAMPLE_INVOICE)} shipment that&apos;s <span className="num font-medium text-ink">{naira(EXAMPLE_INVOICE * feeRates.memberRatePct / 100)}</span> instead of <span className="num">{naira(EXAMPLE_INVOICE * feeRates.nonMemberRatePct / 100)}</span>, on every certificate.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Link to="/dashboard/chamber-network" className={`${btnPrimary} justify-center`}>Find a chamber to join</Link>
                <Link to="/dashboard/connections" className="inline-flex h-10 items-center justify-center rounded-control border border-border-strong bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-surface-alt focus-visible:shadow-focus">
                  Already a member? Link your ID
                </Link>
              </div>
              <p className="mt-3 text-xs text-ink-subtle">You can apply for any certificate today without a membership.</p>
            </section>
          ) : profileError ? (
            <ErrorBanner message="Couldn't load your membership status." onRetry={refetch} />
          ) : (
            <section className="rounded-card border border-border bg-surface p-5">
              <div className="flex items-start justify-between">
                <SectionLabel>Membership</SectionLabel>
                <Status status={profile?.status ?? 'pending_payment'} />
              </div>
              <dl className="mt-4 space-y-2 text-[13px]">
                {profile?.memberId && (
                  <div className="flex justify-between gap-3"><dt className="text-ink-subtle">Member ID</dt><dd className="font-mono text-[12.5px] text-ink">{profile.memberId}</dd></div>
                )}
                {profile?.membershipExpiresAt && (
                  <div className="flex justify-between gap-3"><dt className="text-ink-subtle">Expires</dt><dd className="num text-ink">{new Date(profile.membershipExpiresAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' })}</dd></div>
                )}
              </dl>
              <p className="mt-4 border-t border-border-subtle pt-3 text-[13px] text-ink-muted">
                {profile?.status === 'active'
                  ? `Your certificates qualify for the member rate${feeRates ? ` (${formatRatePct(feeRates.memberRatePct)})` : ''} once the chamber verifies your ID.`
                  : 'Renew to get the member rate on your certificates again.'}
              </p>
              {needsRenewal && (
                <Link to="/dashboard/membership" className={`${btnPrimary} mt-4 w-full justify-center`}>
                  {profile?.status === 'expired' ? 'Renew membership' : 'Complete payment'}
                </Link>
              )}
            </section>
          )}

          <nav aria-label="Shortcuts" className="rounded-card border border-border bg-surface">
            <SectionLabel className="px-5 pt-4 pb-2">Shortcuts</SectionLabel>
            <ul className="pb-2">
              {quickLinks.map((a) => (
                <li key={a.to}>
                  <Link to={a.to} className="group flex items-center gap-3 px-5 py-2.5 text-sm text-ink transition-colors hover:bg-surface-alt hover:text-primary focus-visible:shadow-focus">
                    <span className="material-symbols-outlined text-ink-subtle group-hover:text-primary" aria-hidden="true" style={{ fontSize: 18 }}>{a.icon}</span>
                    <span className="flex-1">{a.label}</span>
                    <span className="material-symbols-outlined text-ink-subtle" aria-hidden="true" style={{ fontSize: 16 }}>chevron_right</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>

      <ExportFootprint
        title="Your export footprint"
        subtitle="Where your certificate applications are headed, and which states the goods come from."
        geo={geo}
        isLoading={ecoLoading}
        isError={ecoError}
        onRetry={refetchEco}
        empty={<p className="text-sm text-ink-muted text-center">Your map fills in as you apply. Each destination and state of origin appears here.</p>}
      />
    </div>
  );
}

function ExecutiveOverview() {
  const { data: stats, isLoading, isError, refetch } = useGetAnalyticsSummaryQuery();
  const { data: trends } = useGetAnalyticsTrendsQuery(6);
  const { data: geo, isLoading: geoLoading, isError: geoError, refetch: refetchGeo } = useGetAnalyticsGeoQuery();
  const growth = stats && stats.revenueLastMonth > 0
    ? (((stats.revenueThisMonth - stats.revenueLastMonth) / stats.revenueLastMonth) * 100).toFixed(1)
    : null;
  const revenueSparkline = trends?.map((t) => t.revenue);

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader
        eyebrow="Executive"
        title="Executive overview"
        description="A read-only view of your chamber's members, certificates and revenue."
        actions={<StatusBadge tone="info">Read-only</StatusBadge>}
      />
      {isLoading ? (
        <MetricsSkeleton />
      ) : isError || !stats ? (
        <div className="mb-6"><ErrorBanner message="Couldn't load the overview metrics." onRetry={refetch} /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatTile icon="group" label="Total Members" value={stats.totalMembers.toLocaleString()} sublabel={`${stats.activeMembers.toLocaleString()} active`} accent />
          <StatTile
            icon="payments"
            label="Revenue This Month"
            value={`₦${(stats.revenueThisMonth / 1_000_000).toFixed(1)}M`}
            sublabel={growth ? `${Number(growth) >= 0 ? '+' : ''}${growth}% vs last month` : 'No revenue last month'}
            sparkline={revenueSparkline}
          />
          <StatTile icon="description" label="Certificates Issued" value={stats.ecoCertificatesIssued.toLocaleString()} sublabel="All time" />
          <StatTile icon="person_add" label="New This Month" value={`+${stats.newMembersThisMonth}`} sublabel="New registrations" />
        </div>
      )}
      <div className="mb-6">
        <ExportFootprint
          title="Your chamber's export activity"
          subtitle="Submitted certificate applications by destination, state of origin and goods."
          geo={geo}
          isLoading={geoLoading}
          isError={geoError}
          onRetry={refetchGeo}
          empty={<p className="text-sm text-ink-muted text-center">No certificate applications yet.</p>}
        />
      </div>
      <ShortcutGrid cols={2} items={[
        { label: 'Analytics', sub: 'Trends, revenue and reports', to: '/dashboard/analytics', icon: 'bar_chart' },
        { label: 'Audit log', sub: 'Every financial and document action', to: '/dashboard/admin', icon: 'history' },
      ]} />
    </div>
  );
}

function InstitutionalOverview() {
  const user = useAppSelector((s) => s.auth.user);
  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8 [&>*]:max-w-4xl">
      <PageHeader
        eyebrow="Institutional"
        title={`Welcome, ${user?.firstName ?? 'Institution'}`}
        description="Verify certificates and exporters, and access trade intelligence."
      />
      <ShortcutGrid cols={2} items={[
        { label: 'Bank verification', sub: 'Verify exporters and trade documents', to: '/dashboard/bank-verification', icon: 'verified' },
        { label: 'Exporter visibility', sub: 'Search active NACCIMA exporters', to: '/dashboard/exporter-visibility', icon: 'visibility' },
        { label: 'Trade corridors', sub: 'Browse active trade routes', to: '/dashboard/trade-corridors', icon: 'route' },
        { label: 'Trade data API', sub: 'Live trade intelligence feeds', to: '/dashboard/trade-data-api', icon: 'api' },
      ]} />
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

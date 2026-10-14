import { Link } from 'react-router-dom';
import { useAppSelector } from '@shared/hooks/useAppDispatch';
import { useGetMemberProfileQuery } from '@features/dashboard/dashboardApi';
import { useGetEcoCertificatesQuery, useGetCertificateTypesQuery } from '@features/eco/ecoApi';
import type { CertificateTypeOption } from '@features/eco/ecoApi';
import { useGetAnalyticsSummaryQuery, useGetAnalyticsTrendsQuery, useGetAnalyticsGeoQuery } from '@features/analytics/analyticsApi';
import { ExportFootprint } from '@features/analytics/components/geo/ExportFootprint';
import { geoFromCertificates } from '@features/analytics/components/geo/geoFromCertificates';
import { useHasChamberConnection } from '@features/membership';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { StatTile } from '@shared/ui/StatTile';
import { Card, CardTitle } from '@shared/ui/Card';
import { MembershipStatusBar } from '@features/analytics/components/MembershipStatusBar';
import { isNoActiveChamberError } from '@shared/utils';

const ADMIN_ROLES = ['chamber_admin', 'super_admin', 'staff_operator'];
const EXECUTIVE_ROLE = 'chamber_executive';
const INSTITUTIONAL_ROLE = 'institutional_subscriber';

const memberStatusStyle: Record<string, { bg: string; text: string; label: string }> = {
  active:          { bg: 'bg-[#a0f4ca]', text: 'text-[#005137]', label: 'Active' },
  expired:         { bg: 'bg-[#ffdad6]', text: 'text-[#93000a]', label: 'Expired' },
  pending_payment: { bg: 'bg-[#ffdea5]', text: 'text-[#5d4201]', label: 'Pending Payment' },
  suspended:       { bg: 'bg-border', text: 'text-ink-subtle', label: 'Suspended' },
};

const ecoStatusStyle: Record<string, string> = {
  draft:              'bg-border text-ink-subtle',
  submitted:          'bg-[#d6e3ff] text-primary',
  under_review:       'bg-[#ffdea5] text-[#5d4201]',
  pending_payment:    'bg-[#ffdea5] text-[#5d4201]',
  approved:           'bg-[#a0f4ca] text-[#002114]',
  issued:             'bg-[#a0f4ca] text-[#002114]',
  rejected:           'bg-[#ffdad6] text-[#93000a]',
  revision_requested: 'bg-[#ffdea5] text-[#5d4201]',
  revoked:            'bg-[#ffdad6] text-[#93000a]',
};

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
    <div className="p-4 sm:p-6 max-w-6xl">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-ink">{isPlatform ? 'Platform Overview' : 'Chamber Overview'}</h2>
        <p className="text-sm text-ink-subtle mt-0.5">
          {isPlatform ? 'Every onboarded chamber — certificates, members and revenue.' : 'Key metrics across all modules.'}
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : isError || !stats ? (
        <div className="rounded-xl border border-[#ffdad6] bg-[#fff8f7] p-5 flex items-center justify-between mb-6">
          <p className="text-sm text-[#93000a]">Failed to load chamber metrics.</p>
          <button onClick={refetch} className="text-sm text-primary hover:underline">Retry</button>
        </div>
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

          {/* Quick links row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Manage Members', sub: 'View and manage all members', to: '/dashboard/admin', icon: 'manage_accounts' },
              { label: 'Certificate Queue', sub: 'Review pending applications', to: '/dashboard/eco', icon: 'task_alt' },
              { label: 'Full Analytics', sub: 'Detailed charts and reports', to: '/dashboard/analytics', icon: 'bar_chart' },
            ].map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="flex items-center gap-4 bg-white rounded-xl border border-border p-4 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#d6e3ff' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: `'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 20`, color: '#023293' }}>{a.icon}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">{a.label}</p>
                  <p className="text-xs text-ink-subtle">{a.sub}</p>
                </div>
                <span className="material-symbols-outlined ml-auto text-ink-subtle" style={{ fontSize: 18 }}>chevron_right</span>
              </Link>
            ))}
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

// Cosmetic only — the form itself keys off goodsSource/requiresMiningLicence,
// never the code, so a type NACCIMA adds later simply gets the default icon.
const certIcon = (t: CertificateTypeOption) =>
  t.requiresMiningLicence ? 'diamond'
    : ({ 'naccima-certificate-of-origin': 'verified', gsp: 'percent', 'ecowas-free-trade': 'handshake', 'movement-certificate': 'local_shipping', 'china-zero-tariff': 'public' } as Record<string, string>)[t.slug]
      ?? 'description';

// The standard member/non-member rates (RFP §4.1.9) — the same figures the
// apply form's fee estimate uses. Shown here as the reason to join a chamber.
const MEMBER_RATE = 0.0011;
const NON_MEMBER_RATE = 0.00125;
const EXAMPLE_INVOICE = 10_000_000;
const naira = (n: number) => `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;

const IN_REVIEW: string[] = ['submitted', 'under_review', 'revision_requested'];
const TO_PAY: string[] = ['approved', 'pending_payment'];

function MemberOverview() {
  const user = useAppSelector((s) => s.auth.user);
  const { data: profile, isLoading: profileLoading, isError: profileError, error: profileErrorObj, refetch } = useGetMemberProfileQuery();
  const { data: certificates, isLoading: ecoLoading, isError: ecoError, refetch: refetchEco } = useGetEcoCertificatesQuery();
  const { data: certificateTypes, isLoading: typesLoading } = useGetCertificateTypesQuery();
  const { hasConnection } = useHasChamberConnection();
  const noChamberConnection = isNoActiveChamberError(profileErrorObj);

  const drafts = certificates?.filter((c) => c.status === 'draft').length ?? 0;
  const inReview = certificates?.filter((c) => IN_REVIEW.includes(c.status)).length ?? 0;
  const toPay = certificates?.filter((c) => TO_PAY.includes(c.status)).length ?? 0;
  const issued = certificates?.filter((c) => c.status === 'issued').length ?? 0;
  const memberStatus = profile?.status ?? 'pending_payment';
  const statusStyle = memberStatusStyle[memberStatus] ?? memberStatusStyle.pending_payment;
  const needsRenewal = profile?.status === 'expired' || profile?.status === 'pending_payment';
  const geo = geoFromCertificates(certificates);

  const quickLinks = [
    { label: 'My certificate applications', to: '/dashboard/eco', icon: 'description', gated: false },
    { label: 'My company (TIN)', to: '/dashboard/company', icon: 'domain', gated: false },
    { label: 'Trade documents', to: '/dashboard/documents', icon: 'folder_open', gated: true },
    { label: 'E-Learning', to: '/dashboard/academy', icon: 'school', gated: true },
  ].filter((l) => !l.gated || hasConnection);

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      {/* Why you're here: one platform account, five certificates. */}
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-ink">Welcome, {user?.firstName ?? 'Exporter'}</h2>
        <p className="text-sm text-ink-muted mt-0.5 max-w-2xl">
          Apply for an export certificate, pay online once it&apos;s approved, and download it — with or without a chamber membership.
        </p>
      </div>

      <section aria-labelledby="certs-title" className="mb-6">
        <div className="flex items-baseline justify-between mb-3">
          <h3 id="certs-title" className="text-sm font-semibold text-ink">Apply for a certificate</h3>
          <Link to="/dashboard/eco" className="text-xs font-medium text-primary hover:underline">My applications</Link>
        </div>
        {typesLoading ? (
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(190px,1fr))]">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} className="h-36" />)}
          </div>
        ) : (
          <ul className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(190px,1fr))]">
            {(certificateTypes ?? []).map((t) => (
              <li key={t.code}>
                <Link
                  to={`/dashboard/eco/apply?type=${encodeURIComponent(t.code)}`}
                  className="group flex h-full flex-col rounded-xl border border-border bg-white p-4 transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <span className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 20, fontVariationSettings: `'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 20` }}>{certIcon(t)}</span>
                  </span>
                  <span className="text-sm font-semibold leading-snug text-ink">{t.name}</span>
                  {t.description && <span className="mt-1 text-xs leading-relaxed text-ink-muted line-clamp-3">{t.description}</span>}
                  <span className="mt-auto pt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    Apply
                    <span className="material-symbols-outlined transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" style={{ fontSize: 16 }}>arrow_forward</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Where your applications stand */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Drafts', value: drafts, sub: 'Saved, not submitted', icon: 'edit_note' },
          { label: 'In review', value: inReview, sub: 'With the chamber', icon: 'pending_actions' },
          { label: 'Ready to pay', value: toPay, sub: 'Approved — pay to issue', icon: 'payments', emphasis: toPay > 0 },
          { label: 'Issued', value: issued, sub: `${certificates?.length ?? 0} applications in total`, icon: 'verified' },
        ].map((t) => (
          <Link
            key={t.label}
            to="/dashboard/eco"
            className={`rounded-xl border p-4 transition-colors hover:border-primary/40 ${t.emphasis ? 'border-[#ffdea5] bg-[#fffaf0]' : 'border-border bg-white'}`}
          >
            <div className="flex items-start justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">{t.label}</p>
              <span className="material-symbols-outlined text-ink-subtle" aria-hidden="true" style={{ fontSize: 18 }}>{t.icon}</span>
            </div>
            {ecoLoading ? <SkeletonCard className="h-8 w-12 mt-2" /> : (
              <>
                <p className="mt-1 text-2xl font-bold text-ink tabular-nums">{t.value}</p>
                <p className="text-xs text-ink-subtle mt-0.5">{t.sub}</p>
              </>
            )}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Recent applications */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex justify-between items-center">
            <h3 className="text-sm font-semibold text-ink">Recent certificate applications</h3>
            <Link to="/dashboard/eco" className="text-xs font-medium text-primary hover:underline">View all</Link>
          </div>
          {ecoLoading ? (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => <SkeletonCard key={i} className="h-10" />)}
            </div>
          ) : ecoError ? (
            <div className="p-5 flex items-center justify-between">
              <p className="text-sm text-danger">Couldn&apos;t load your applications.</p>
              <button onClick={refetchEco} className="text-sm text-primary hover:underline">Retry</button>
            </div>
          ) : !certificates || certificates.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-ink-muted">No applications yet. Pick a certificate above to start one.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-surface-alt border-b border-border">
                    <th className="px-5 py-3 text-xs font-semibold text-ink-subtle uppercase tracking-wide">Reference</th>
                    <th className="px-5 py-3 text-xs font-semibold text-ink-subtle uppercase tracking-wide">Destination</th>
                    <th className="px-5 py-3 text-xs font-semibold text-ink-subtle uppercase tracking-wide">Status</th>
                    <th className="px-5 py-3 text-xs font-semibold text-ink-subtle uppercase tracking-wide">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f2f4]">
                  {certificates.slice(0, 5).map((cert) => (
                    <tr key={cert.id} className="hover:bg-surface-alt transition-colors">
                      <td className="px-5 py-3">
                        <Link to={`/dashboard/eco/${cert.id}`} className="font-semibold text-ink hover:text-primary">
                          {cert.certificateNumber ?? cert.id.slice(0, 12).toUpperCase()}
                        </Link>
                        <p className="text-xs text-ink-subtle truncate max-w-[180px]">
                          {certificateTypes?.find((t) => t.code === cert.certificateTypeCode)?.name ?? cert.solidMineralName ?? '—'}
                        </p>
                      </td>
                      <td className="px-5 py-3 text-ink">{cert.destinationCountry ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ecoStatusStyle[cert.status] ?? 'bg-border text-ink-subtle'}`}>
                          {cert.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-ink-subtle tabular-nums">
                        {new Date(cert.createdAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Membership — an incentive when there is none, a status when there is. */}
          {profileLoading ? (
            <SkeletonCard className="h-48" />
          ) : noChamberConnection ? (
            <div className="rounded-xl border border-[#cfe0d8] bg-[linear-gradient(160deg,#f2faf6_0%,#ffffff_70%)] p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-success">Chamber membership</p>
              <h3 className="mt-1 text-base font-semibold text-ink leading-snug">Members pay less on every certificate</h3>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-white border border-border px-2 py-2">
                  <dt className="text-[11px] text-ink-subtle">Non-member</dt>
                  <dd className="text-sm font-bold text-ink tabular-nums">{(NON_MEMBER_RATE * 100).toFixed(3).replace(/0+$/, '')}%</dd>
                </div>
                <div className="rounded-lg bg-white border border-success/40 px-2 py-2">
                  <dt className="text-[11px] text-success font-medium">Member</dt>
                  <dd className="text-sm font-bold text-success tabular-nums">{(MEMBER_RATE * 100).toFixed(2)}%</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs text-ink-muted leading-relaxed">
                of invoice value. On a {naira(EXAMPLE_INVOICE)} shipment that&apos;s {naira(EXAMPLE_INVOICE * MEMBER_RATE)} instead of {naira(EXAMPLE_INVOICE * NON_MEMBER_RATE)} — a saving on every certificate you apply for.
              </p>
              <div className="mt-4 flex flex-col gap-2">
                <Link to="/dashboard/chamber-network" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-success px-3 py-2 text-xs font-semibold text-white hover:opacity-90 transition-opacity">
                  Find a chamber to join
                </Link>
                <Link to="/dashboard/connections" className="inline-flex items-center justify-center rounded-lg border border-border bg-white px-3 py-2 text-xs font-medium text-ink hover:border-primary hover:text-primary transition-colors">
                  Already a member? Link your ID
                </Link>
              </div>
              <p className="mt-3 text-[11px] text-ink-subtle">You can apply for any certificate today without a membership.</p>
            </div>
          ) : profileError ? (
            <div className="rounded-xl border border-[#ffdad6] bg-[#fff8f7] p-5 flex items-center justify-between">
              <p className="text-sm text-[#93000a]">Failed to load membership status.</p>
              <button onClick={refetch} className="text-sm text-primary hover:underline">Retry</button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-border p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-subtle">Membership</p>
                <span className="material-symbols-outlined" aria-hidden="true" style={{ fontSize: 20, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 20`, color: '#74777f' }}>verified_user</span>
              </div>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${statusStyle.bg} ${statusStyle.text}`}>
                {statusStyle.label}
              </span>
              {profile?.memberId && <p className="text-xs text-ink-subtle mt-2">ID: {profile.memberId}</p>}
              {profile?.membershipExpiresAt && (
                <p className="text-xs text-ink-subtle mt-0.5">
                  Expires: {new Date(profile.membershipExpiresAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' })}
                </p>
              )}
              <p className="text-xs text-ink-muted mt-3">
                {profile?.status === 'active'
                  ? `Your certificates qualify for the ${(MEMBER_RATE * 100).toFixed(2)}% member rate once the chamber verifies your ID.`
                  : 'Renew to get the member rate on your certificates again.'}
              </p>
              {needsRenewal && (
                <Link to="/dashboard/membership" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white hover:opacity-90">
                  {profile?.status === 'expired' ? 'Renew membership' : 'Complete payment'}
                </Link>
              )}
            </div>
          )}

          <nav aria-label="Shortcuts" className="bg-white rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold text-ink mb-3">Shortcuts</h3>
            <ul className="space-y-1.5">
              {quickLinks.map((a) => (
                <li key={a.to}>
                  <Link to={a.to} className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm text-ink hover:border-primary hover:text-primary transition-colors">
                    <span className="flex items-center gap-2.5">
                      <span className="material-symbols-outlined text-ink-subtle" aria-hidden="true" style={{ fontSize: 16 }}>{a.icon}</span>
                      {a.label}
                    </span>
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
        empty={<p className="text-sm text-ink-muted text-center">Your map fills in as you apply — each destination and state of origin appears here.</p>}
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
    <div className="p-6 max-w-6xl">
      <div className="mb-6 flex items-center gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink">Executive Overview</h2>
          <p className="text-sm text-ink-subtle mt-0.5">Read-only analytics view.</p>
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
          <button onClick={refetch} className="text-sm text-primary hover:underline">Retry</button>
        </div>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: 'Full Analytics', sub: 'Detailed charts and reports', to: '/dashboard/analytics', icon: 'bar_chart' },
          { label: 'Member Directory', sub: 'View all registered members', to: '/dashboard/admin', icon: 'group' },
        ].map((a) => (
          <Link key={a.to} to={a.to} className="flex items-center gap-4 bg-white rounded-xl border border-border p-4 hover:border-primary/30 hover:shadow-sm transition-all">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#d6e3ff' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: `'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 20`, color: '#023293' }}>{a.icon}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">{a.label}</p>
              <p className="text-xs text-ink-subtle">{a.sub}</p>
            </div>
            <span className="material-symbols-outlined ml-auto text-ink-subtle" style={{ fontSize: 18 }}>chevron_right</span>
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
        <h2 className="text-xl font-semibold text-ink">Welcome, {user?.firstName ?? 'Institution'}!</h2>
        <p className="text-sm text-ink-subtle mt-0.5">Access verification services and trade intelligence.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: 'Bank Verification', sub: 'Verify exporters and trade documents', to: '/dashboard/bank-verification', icon: 'verified' },
          { label: 'Exporter Visibility', sub: 'Search active NACCIMA exporters', to: '/dashboard/exporter-visibility', icon: 'visibility' },
          { label: 'Trade Corridors', sub: 'Browse active trade routes', to: '/dashboard/trade-corridors', icon: 'route' },
          { label: 'Trade Data API', sub: 'Access live trade intelligence feeds', to: '/dashboard/trade-data-api', icon: 'api' },
        ].map((a) => (
          <Link key={a.to} to={a.to} className="flex items-center gap-4 bg-white rounded-xl border border-border p-5 hover:border-primary/30 hover:shadow-sm transition-all">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#d6e3ff' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, fontVariationSettings: `'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 20`, color: '#023293' }}>{a.icon}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">{a.label}</p>
              <p className="text-xs text-ink-subtle">{a.sub}</p>
            </div>
            <span className="material-symbols-outlined ml-auto text-ink-subtle" style={{ fontSize: 18 }}>chevron_right</span>
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

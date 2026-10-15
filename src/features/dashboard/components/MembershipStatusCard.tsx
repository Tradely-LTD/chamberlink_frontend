import { Link } from 'react-router-dom';
import type { MemberProfile } from '@entities/user/types';
import { SkeletonCard } from '@shared/ui/SkeletonCard';

const statusColors: Record<string, string> = {
  active: 'bg-success-bg text-success',
  expired: 'bg-danger-bg text-danger',
  pending_payment: 'bg-warning-bg text-warning',
  suspended: 'bg-border-subtle text-ink',
};

const statusLabels: Record<string, string> = {
  active: 'Active',
  expired: 'Expired',
  pending_payment: 'Pending Payment',
  suspended: 'Suspended',
};

interface Props {
  profile?: MemberProfile;
  isLoading: boolean;
  error?: boolean;
  /**
   * True when the failure is specifically "no active chamber connection" —
   * an expected, normal state for a brand-new ChamberLink identity, not a
   * real error. Renders a "connect a chamber" prompt instead of a red banner.
   */
  noConnection?: boolean;
  onRetry?: () => void;
}

export function MembershipStatusCard({
  profile,
  isLoading,
  error,
  noConnection,
  onRetry,
}: Props) {
  if (isLoading) return <SkeletonCard className="h-28" />;

  if (noConnection) {
    return (
      <div className="rounded-card border border-dashed border-border bg-surface-alt p-5">
        <p className="text-xs font-medium text-ink-subtle uppercase tracking-wide mb-2">
          Membership Status
        </p>
        <p className="text-sm text-ink mb-2">You&apos;re not connected to a chamber yet.</p>
        <Link to="/dashboard/connections" className="text-sm font-medium text-primary hover:underline">
          Connect a chamber
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-card border border-danger-border bg-danger-bg p-5 flex items-center justify-between">
        <p className="text-sm text-danger">
          Failed to load membership status.
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm text-primary hover:underline"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  const status = profile?.status ?? 'pending_payment';

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <p className="text-xs font-medium text-ink-subtle uppercase tracking-wide mb-3">
        Membership Status
      </p>
      <div className="flex items-center justify-between">
        <div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
              statusColors[status] ?? statusColors['pending_payment']
            }`}
          >
            {statusLabels[status] ?? status}
          </span>
          {profile?.memberId && (
            <p className="mt-1 text-xs text-ink-subtle">
              ID: {profile.memberId}
            </p>
          )}
        </div>
        {profile?.membershipExpiresAt && (
          <div className="text-right">
            <p className="text-xs text-ink-subtle">Expires</p>
            <p className="text-sm font-medium text-ink">
              {new Date(profile.membershipExpiresAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

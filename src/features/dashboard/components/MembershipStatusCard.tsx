import { Link } from 'react-router-dom';
import type { MemberProfile } from '@entities/user/types';
import { SkeletonCard } from '@shared/ui/SkeletonCard';

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  expired: 'bg-red-100 text-red-800',
  pending_payment: 'bg-amber-100 text-amber-800',
  suspended: 'bg-gray-100 text-gray-800',
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
      <div className="rounded-xl border border-dashed border-[#bec9bf]/60 bg-[#f7f9f7] p-5">
        <p className="text-xs font-medium text-[#8A7E6E] uppercase tracking-wide mb-2">
          Membership Status
        </p>
        <p className="text-sm text-[#221a0f] mb-2">You&apos;re not connected to a chamber yet.</p>
        <Link to="/dashboard/connections" className="text-sm font-medium text-[#023293] hover:underline">
          Connect a chamber
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 flex items-center justify-between">
        <p className="text-sm text-red-700">
          Failed to load membership status.
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm text-[#023293] hover:underline"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  const status = profile?.status ?? 'pending_payment';

  return (
    <div className="rounded-xl border border-[#bec9bf]/40 bg-white p-5">
      <p className="text-xs font-medium text-[#8A7E6E] uppercase tracking-wide mb-3">
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
            <p className="mt-1 text-xs text-[#8A7E6E]">
              ID: {profile.memberId}
            </p>
          )}
        </div>
        {profile?.membershipExpiresAt && (
          <div className="text-right">
            <p className="text-xs text-[#8A7E6E]">Expires</p>
            <p className="text-sm font-medium text-[#221a0f]">
              {new Date(profile.membershipExpiresAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos' })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

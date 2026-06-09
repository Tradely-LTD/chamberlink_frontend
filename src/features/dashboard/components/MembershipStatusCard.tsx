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
  onRetry?: () => void;
}

export function MembershipStatusCard({
  profile,
  isLoading,
  error,
  onRetry,
}: Props) {
  if (isLoading) return <SkeletonCard className="h-28" />;

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 flex items-center justify-between">
        <p className="text-sm text-red-700">
          Failed to load membership status.
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm text-[#00502e] hover:underline"
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

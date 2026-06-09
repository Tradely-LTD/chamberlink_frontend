import { useAppSelector } from '@shared/hooks/useAppDispatch';
import { useGetMemberProfileQuery } from '../dashboardApi';
import { MembershipStatusCard } from './MembershipStatusCard';
import { RecentActivityPlaceholder } from './RecentActivityPlaceholder';

export function OverviewPanel() {
  const user = useAppSelector((s) => s.auth.user);
  const { data: profile, isLoading, isError, refetch } = useGetMemberProfileQuery();

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-semibold text-[#221a0f] mb-1">
        Welcome back, {user?.firstName ?? 'Member'}!
      </h1>
      <p className="text-sm text-[#8A7E6E] mb-6">
        Here&apos;s an overview of your account.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <MembershipStatusCard
          profile={profile}
          isLoading={isLoading}
          error={isError}
          onRetry={refetch}
        />
        <RecentActivityPlaceholder />
      </div>
    </div>
  );
}

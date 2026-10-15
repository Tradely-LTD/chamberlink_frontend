import { useState } from 'react';
import { useGetMembershipTiersQuery, useGetMembershipStatusQuery } from '@features/membership/membershipApi';
import { ConnectChamberModal } from '@features/membership/components/ConnectChamberModal';
import { emptyApi } from '@shared/api/emptyApi';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { EmptyState } from '@shared/ui/EmptyState';
import { Button } from '@shared/ui/Button';
import { Toast } from '@shared/ui/Toast';
import { isNoActiveChamberError } from '@shared/utils';
import { PageHeader } from '@shared/ui/PageHeader';
import { Status, StatusBadge } from '@shared/ui/StatusBadge';
import { SectionCard, DetailGrid } from '@shared/ui/SectionCard';

interface PaymentResult { authorizationUrl: string; reference: string; }
interface ApiResponse<T> { success: boolean; data: T; }

const membershipPayApi = emptyApi.injectEndpoints({
  endpoints: (builder) => ({
    initiateDuesPayment: builder.mutation<PaymentResult, { tierId?: string }>({
      query: (body) => ({
        url: '/membership/dues/initiate',
        method: 'POST',
        body: { ...body, callbackUrl: `${window.location.origin}/dashboard/membership` },
      }),
      transformResponse: (res: ApiResponse<PaymentResult>) => res.data,
    }),
  }),
  overrideExisting: false,
});
const { useInitiateDuesPaymentMutation } = membershipPayApi;



export function MembershipPage() {
  const { data: status, isLoading: statusLoading, isError: statusError, error: statusErrorObj } = useGetMembershipStatusQuery();
  const { data: tiers, isLoading: tiersLoading } = useGetMembershipTiersQuery();
  const [initiateDues, { isLoading: payLoading }] = useInitiateDuesPaymentMutation();
  const [payError, setPayError] = useState<string | null>(null);
  const [payingTierId, setPayingTierId] = useState<string | null>(null);
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handlePay = async (tierId?: string) => {
    setPayError(null);
    setPayingTierId(tierId ?? 'current');
    try {
      const result = await initiateDues({ tierId }).unwrap();
      window.location.href = result.authorizationUrl;
    } catch {
      setPayError('Payment service unavailable. Please try again shortly.');
      setPayingTierId(null);
    }
  };

  if (statusLoading || tiersLoading) return <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8"><SkeletonCard /><div className="mt-4"><SkeletonCard /></div></div>;

  if (statusError) {
    if (isNoActiveChamberError(statusErrorObj)) {
      return (
        <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8 [&>*]:max-w-3xl">
          <PageHeader title="Membership" description="View your membership status and available tiers." />
          <EmptyState
            icon="corporate_fare"
            title="You're not connected to a chamber yet"
            message="Connect to a chamber to view your membership status, pay dues, and access member benefits."
            action={<Button onClick={() => setConnectModalOpen(true)}>Connect a chamber</Button>}
          />
          {connectModalOpen && (
            <ConnectChamberModal
              onClose={() => setConnectModalOpen(false)}
              onConnected={(message) => setToast({ message, type: 'success' })}
            />
          )}
          {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
      );
    }
    return <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8"><ErrorBanner message="Failed to load membership information." /></div>;
  }

  const expiresAt = status?.expiresAt ? new Date(status.expiresAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const memberSince = status?.memberSince ? new Date(status.memberSince).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const needsPayment = status?.status === 'expired' || status?.status === 'pending_payment';

  const fmt = (n: number) => `₦${n.toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-8 sm:py-8">
      <PageHeader title="Membership" description="Your plan with this chamber, and the plans you can move to." />
      <div className="max-w-4xl space-y-8">
        {payError && <ErrorBanner message={payError} />}

        <SectionCard
          title="Your membership"
          description={status?.tierName ? `${status.tierName.replace(/^\w/, (c) => c.toUpperCase())} plan` : undefined}
          action={status?.status && <Status status={status.status} />}
          footer={needsPayment && (
            <Button loading={payLoading && payingTierId === 'current'} onClick={() => handlePay(status?.tierId)}>
              {status?.status === 'expired' ? 'Renew membership' : 'Pay to activate'}
            </Button>
          )}
        >
          <DetailGrid items={[
            { label: 'Member ID', value: status?.memberId && <span className="font-mono text-[13px]">{status.memberId}</span> },
            { label: 'Plan', value: status?.tierName && <span className="capitalize">{status.tierName}</span> },
            { label: 'Member since', value: memberSince },
            { label: status?.status === 'expired' ? 'Expired on' : 'Renews on', value: expiresAt },
          ]} />
        </SectionCard>

        <section aria-labelledby="plans">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 id="plans" className="text-[15px] font-semibold text-ink">Plans</h2>
            <p className="text-[13px] text-ink-subtle">Annual dues, paid online</p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(tiers ?? []).map((tier) => {
              const isCurrentActive = status?.tierName?.toLowerCase() === tier.name.toLowerCase() && status?.status === 'active';
              const isBusy = payLoading && payingTierId === tier.id;
              return (
                <li key={tier.id} className={`flex flex-col rounded-card border bg-surface p-5 ${isCurrentActive ? 'border-primary shadow-focus' : 'border-border'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold capitalize text-ink">{tier.name}</p>
                    {isCurrentActive && <StatusBadge tone="info">Your plan</StatusBadge>}
                  </div>
                  <p className="mt-3 num text-[26px] font-semibold leading-none text-ink">{fmt(Number(tier.annualDues ?? 0))}</p>
                  <p className="mt-1 text-xs text-ink-subtle">per year</p>
                  <Button
                    size="sm"
                    variant={isCurrentActive ? 'secondary' : 'primary'}
                    className="mt-5 w-full"
                    disabled={isCurrentActive || (payLoading && payingTierId !== tier.id)}
                    loading={isBusy}
                    onClick={() => !isCurrentActive && handlePay(tier.id)}
                  >
                    {isCurrentActive ? 'Current plan' : 'Choose plan'}
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useGetMembershipTiersQuery, useGetMembershipStatusQuery } from '@features/membership/membershipApi';
import { ConnectChamberModal } from '@features/membership/components/ConnectChamberModal';
import { emptyApi } from '@shared/api/emptyApi';
import { SkeletonCard } from '@shared/ui/SkeletonCard';
import { ErrorBanner } from '@shared/ui/ErrorBanner';
import { EmptyState } from '@shared/ui/EmptyState';
import { Button } from '@shared/ui/Button';
import { Spinner } from '@shared/ui/Spinner';
import { Toast } from '@shared/ui/Toast';
import { isNoActiveChamberError } from '@shared/utils';

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

const tierColors: Record<string, string> = {
  ordinary: 'bg-gray-100 text-gray-700',
  associate: 'bg-blue-100 text-blue-700',
  patron: 'bg-amber-100 text-amber-700',
  corporate: 'bg-green-100 text-green-700',
};

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  pending_payment: 'bg-yellow-100 text-yellow-800',
  expired: 'bg-red-100 text-red-800',
  suspended: 'bg-gray-100 text-gray-700',
};

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

  if (statusLoading || tiersLoading) return <div className="p-6"><SkeletonCard /><div className="mt-4"><SkeletonCard /></div></div>;

  if (statusError) {
    if (isNoActiveChamberError(statusErrorObj)) {
      return (
        <div className="p-6 max-w-3xl">
          <h1 className="text-2xl font-semibold text-[#221a0f] mb-1">Membership</h1>
          <p className="text-sm text-[#8A7E6E] mb-6">View your membership status and available tiers.</p>
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
    return <div className="p-6"><ErrorBanner message="Failed to load membership information." /></div>;
  }

  const expiresAt = status?.expiresAt ? new Date(status.expiresAt).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const memberSince = status?.memberSince ? new Date(status.memberSince).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const needsPayment = status?.status === 'expired' || status?.status === 'pending_payment';

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold text-[#221a0f] mb-1">Membership</h1>
      <p className="text-sm text-[#8A7E6E] mb-6">View your membership status and available tiers.</p>

      {payError && <div className="mb-4"><ErrorBanner message={payError} /></div>}

      {/* Current Status Card */}
      <div className="bg-white rounded-xl border border-[#bec9bf]/40 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-[#bec9bf]/40 flex items-center justify-between">
          <h2 className="font-medium text-[#221a0f]">Current Membership</h2>
          {status?.status && (
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusColors[status.status] ?? 'bg-gray-100 text-gray-700'}`}>
              {status.status.replace(/_/g, ' ')}
            </span>
          )}
        </div>
        <dl className="divide-y divide-[#bec9bf]/30">
          {[
            { label: 'Tier', value: status?.tierName ?? '—' },
            { label: 'Member Since', value: memberSince ?? '—' },
            { label: 'Expires', value: expiresAt ?? '—' },
            { label: 'Member ID', value: status?.memberId ?? '—' },
          ].map((row) => (
            <div key={row.label} className="grid grid-cols-3 gap-4 px-6 py-4">
              <dt className="text-sm font-medium text-[#8A7E6E]">{row.label}</dt>
              <dd className="col-span-2 text-sm text-[#221a0f] capitalize">{row.value}</dd>
            </div>
          ))}
        </dl>
        {needsPayment && (
          <div className="px-6 py-4 border-t border-[#bec9bf]/40">
            <Button
              className="bg-[#795900] hover:bg-[#5c4300] text-white"
              loading={payLoading && payingTierId === 'current'}
              onClick={() => handlePay(status?.tierId)}
            >
              {status?.status === 'expired' ? 'Renew Membership' : 'Complete Payment'}
            </Button>
          </div>
        )}
      </div>

      {/* Available Tiers */}
      <h2 className="text-lg font-semibold text-[#221a0f] mb-4">Available Tiers</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {(tiers ?? []).map((tier) => {
          const isCurrentActive = status?.tierName?.toLowerCase() === tier.name.toLowerCase() && status?.status === 'active';
          const isBusy = payLoading && payingTierId === tier.id;
          return (
            <div key={tier.id} className="bg-white rounded-xl border border-[#bec9bf]/40 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${tierColors[tier.name.toLowerCase()] ?? 'bg-gray-100 text-gray-700'}`}>
                    {tier.name}
                  </span>
                  <p className="text-xl font-bold text-[#023293] mt-2">
                    ₦{Number(tier.annualDues ?? 0).toLocaleString()}
                    <span className="text-sm font-normal text-[#8A7E6E]">/year</span>
                  </p>
                </div>
              </div>
              <p className="text-sm text-[#8A7E6E] mb-4">Full NACCIMA membership benefits.</p>
              <Button
                variant={isCurrentActive ? 'outline' : 'primary'}
                className="w-full"
                disabled={isCurrentActive || (payLoading && payingTierId !== tier.id)}
                loading={isBusy}
                onClick={() => !isCurrentActive && handlePay(tier.id)}
              >
                {isBusy ? <Spinner size="sm" /> : isCurrentActive ? 'Current Plan' : 'Select Plan'}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

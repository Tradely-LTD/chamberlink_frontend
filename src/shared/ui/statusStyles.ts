import type { StatusTone } from './StatusBadge';

/** Every application/membership status in the portal, mapped once. */
const STATUS_TONE: Record<string, StatusTone> = {
  draft: 'neutral', submitted: 'info', under_review: 'warning', revision_requested: 'warning',
  approved: 'gold', pending_payment: 'gold', issued: 'success', rejected: 'danger', revoked: 'danger',
  active: 'success', expired: 'danger', suspended: 'neutral', pending: 'warning', pending_review: 'warning',
  verified: 'success', failed: 'danger', inactive: 'neutral', cancelled: 'neutral', reserved: 'info', checked_in: 'success',
  success: 'success', paid: 'success',
};

const STATUS_LABEL: Record<string, string> = {
  pending_payment: 'Awaiting payment', under_review: 'Under review', revision_requested: 'Changes requested',
  pending_review: 'Pending review', checked_in: 'Checked in',
};

export const statusTone = (status: string): StatusTone => STATUS_TONE[status] ?? 'neutral';
export const statusLabel = (status: string) =>
  STATUS_LABEL[status] ?? status.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());

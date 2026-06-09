export type MembershipStatus = 'pending_payment' | 'active' | 'expired' | 'suspended';

export interface MembershipTier {
  id: string;
  name: string;
  displayName: string;
  annualDues: number;
  description?: string;
  benefits: string[];
  isActive: boolean;
}

export interface MembershipRenewal {
  id: string;
  memberId: string;
  tierId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

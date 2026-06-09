export type Role =
  | 'member'
  | 'staff_operator'
  | 'institutional_subscriber'
  | 'chamber_admin'
  | 'kaccima_executive'
  | 'super_admin';

export const MFA_REQUIRED_ROLES: Role[] = ['chamber_admin', 'kaccima_executive', 'super_admin'];

export interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: Role;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  isMfaEnabled?: boolean;
}

export interface MemberProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  businessName?: string;
  memberId?: string;
  tierId?: string;
  status: 'pending_payment' | 'active' | 'expired' | 'suspended';
  membershipExpiresAt?: string;
  // Business profile fields
  registrationNumber?: string;
  industry?: string;
  address?: string;
  city?: string;
  state?: string;
  website?: string;
  logoKey?: string;
  logoUrl?: string;
}

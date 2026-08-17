export type Role =
  | 'member'
  | 'staff_operator'
  | 'institutional_subscriber'
  | 'chamber_admin'
  | 'chamber_executive'
  | 'super_admin'
  | 'public';

export const MFA_REQUIRED_ROLES: Role[] = ['chamber_admin', 'chamber_executive', 'super_admin'];

export interface AuthUser {
  id: string;
  email: string;
  /** Basic ChamberLink identity — global, chamber-independent (not per-connection). */
  firstName: string;
  lastName: string;
  role: Role;
  /** Staff/admin employer tenant only. UNCHANGED meaning — null for members. */
  tenantId?: string | null;
  /**
   * The member's current chamber workspace. Null when the user has zero chamber
   * connections, or has connections but none currently selected as active.
   */
  activeTenantId?: string | null;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  isMfaEnabled?: boolean;
}

/** One row of GET /membership/connections — a user's connection to a single chamber. */
export interface ChamberConnection {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  tenantLogoUrl: string | null;
  memberId: string;
  status: 'active' | 'expired' | 'suspended' | 'pending_payment';
  tierId: string;
  tierName: string;
  memberSince: string | null;
  expiresAt: string | null;
  /** True iff this is the user's current activeTenantId. */
  isActive: boolean;
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

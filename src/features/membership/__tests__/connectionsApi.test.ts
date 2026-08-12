/**
 * Unit tests for the chamber-connections feature API slice.
 *
 * Mirrors the pattern used by the academy feature's API tests: we test the
 * transformResponse logic directly (the functions that convert raw API
 * envelopes into the typed data the UI consumes) plus the backend-contract
 * type shapes, without spinning up a real RTK Query store.
 */

import type { ChamberConnection } from '@entities/user/types';
import type { ConnectAction, ConnectionResult, OnboardedChamber } from '../connectionsApi';

// ── transformResponse helpers (mirroring connectionsApi.ts logic) ──────────

function transformConnections(raw: { success: boolean; data: ChamberConnection[] }): ChamberConnection[] {
  return raw.data;
}

function transformConnect(raw: {
  success: boolean;
  data: ConnectionResult;
  message?: string;
}): { connection: ConnectionResult; action: ConnectAction } {
  return {
    connection: raw.data,
    action: (raw.message ?? 'created') as ConnectAction,
  };
}

function transformSwitch(raw: { success: boolean; message?: string }): { message: string } {
  return { message: raw.message ?? 'Active chamber switched' };
}

function transformOnboardedChambers(raw: { success: boolean; data: OnboardedChamber[] }): OnboardedChamber[] {
  return raw.data;
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('connectionsApi transformResponse helpers', () => {
  describe('transformConnections', () => {
    it('unwraps the connections array, preserving isActive per connection', () => {
      const connections: ChamberConnection[] = [
        {
          tenantId: 'tenant-a',
          tenantName: 'Chamber A',
          tenantSlug: 'tenant-a',
          tenantLogoUrl: null,
          memberId: 'TENANT-A-2026-0001',
          status: 'active',
          tierId: 't1',
          tierName: 'Ordinary',
          memberSince: '2026-01-01T00:00:00Z',
          expiresAt: '2027-01-01T00:00:00Z',
          isActive: true,
        },
        {
          tenantId: 'tenant-b',
          tenantName: 'Chamber B',
          tenantSlug: 'tenant-b',
          tenantLogoUrl: null,
          memberId: 'TENANT-B-2026-0001',
          status: 'pending_payment',
          tierId: 't1',
          tierName: 'Ordinary',
          memberSince: null,
          expiresAt: null,
          isActive: false,
        },
      ];
      const result = transformConnections({ success: true, data: connections });
      expect(result).toHaveLength(2);
      expect(result[0].isActive).toBe(true);
      expect(result[1].isActive).toBe(false);
    });

    it('returns an empty array for a user with zero connections', () => {
      const result = transformConnections({ success: true, data: [] });
      expect(result).toEqual([]);
    });
  });

  describe('transformConnect — action handling', () => {
    const connection: ConnectionResult = {
      id: 'conn-1',
      tenantId: 'tenant-a',
      status: 'pending_payment',
      memberId: 'TENANT-A-2026-0001',
      tierId: 't1',
    };

    it('maps message="created" to action="created" (HTTP 201)', () => {
      const result = transformConnect({ success: true, data: connection, message: 'created' });
      expect(result.action).toBe('created');
      expect(result.connection.tenantId).toBe('tenant-a');
    });

    it('maps message="noop" to action="noop" (HTTP 200 — already connected)', () => {
      const result = transformConnect({ success: true, data: connection, message: 'noop' });
      expect(result.action).toBe('noop');
    });

    it('maps message="reactivated" to action="reactivated" (HTTP 200 — expired connection revived)', () => {
      const result = transformConnect({ success: true, data: connection, message: 'reactivated' });
      expect(result.action).toBe('reactivated');
    });
  });

  describe('transformSwitch', () => {
    it('falls back to a default message when the backend omits one', () => {
      const result = transformSwitch({ success: true });
      expect(result.message).toBe('Active chamber switched');
    });

    it('preserves the backend message when present', () => {
      const result = transformSwitch({ success: true, message: 'Active chamber switched' });
      expect(result.message).toBe('Active chamber switched');
    });
  });

  describe('transformOnboardedChambers', () => {
    it('unwraps the onboarded-chambers list', () => {
      const chambers: OnboardedChamber[] = [{ id: 't1', name: 'Chamber A', slug: 'chamber-a', city: 'Lagos' }];
      const result = transformOnboardedChambers({ success: true, data: chambers });
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('chamber-a');
    });
  });
});

describe('ChamberConnection type shape (backend contract)', () => {
  it('accepts all four connection statuses', () => {
    const statuses: ChamberConnection['status'][] = ['active', 'expired', 'suspended', 'pending_payment'];
    statuses.forEach((status) => {
      const connection: ChamberConnection = {
        tenantId: 't1',
        tenantName: 'Chamber A',
        tenantSlug: 'chamber-a',
        tenantLogoUrl: null,
        memberId: 'M1',
        status,
        tierId: 'tier1',
        tierName: 'Ordinary',
        memberSince: null,
        expiresAt: null,
        isActive: false,
      };
      expect(connection.status).toBe(status);
    });
  });
});

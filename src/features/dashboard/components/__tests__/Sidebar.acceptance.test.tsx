/**
 * Acceptance test — Sidebar nav visibility for the "Chamber Network" item
 * (AC1 of the Chamber Network user story).
 *
 * Story requirement: "Chamber Network" is a MEMBER-ROLE-ONLY nav item. This
 * mounts the REAL Sidebar component (real Redux store + real RTK Query
 * emptyApi + real react-router) for EACH of the six platform roles and
 * asserts the nav item is visible for member only, and absent for every
 * other role (staff_operator, chamber_admin, chamber_executive,
 * institutional_subscriber, super_admin).
 *
 * Only the network boundary (global.fetch) is mocked — chamber_admin
 * additionally fires useGetMyTenantQuery (GET /tenants/me), so that request
 * is stubbed too; every other role skips it entirely.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { emptyApi } from '@shared/api/emptyApi';
import authReducer from '@features/auth/authSlice';
import type { Role } from '@entities/user/types';
import { Sidebar } from '../Sidebar';

const jsonResponse = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  );

// Mutated per-test by the connection-gating describe block below; every
// other describe block leaves this at its default (0 connections), which is
// harmless since none of their assertions touch the gated labels.
let connectionsFixture: unknown[] = [];

beforeEach(() => {
  connectionsFixture = [];
  // jsdom (this repo's vitest environment) has no ResizeObserver — Sidebar
  // uses one purely for a cosmetic "more items below the fold" scroll-fade
  // indicator, unrelated to what this test verifies. Stubbed here rather
  // than touching Sidebar.tsx or the shared test setup.
  (global as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const request = input instanceof Request ? input : new Request(input as string);
    if (request.url.includes('/tenants/me')) {
      return jsonResponse({ success: true, data: { id: 'tenant-a', name: 'Lagos Chamber of Commerce' } });
    }
    if (request.url.includes('/membership/connections')) {
      return jsonResponse({ success: true, data: connectionsFixture });
    }
    throw new Error(`Unexpected fetch in Sidebar acceptance test: ${request.url}`);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  vi.restoreAllMocks();
});

const renderSidebarForRole = (role: Role | null) => {
  const store = configureStore({
    reducer: { auth: authReducer, [emptyApi.reducerPath]: emptyApi.reducer },
    middleware: (getDefault) => getDefault().concat(emptyApi.middleware),
    preloadedState: {
      auth: {
        accessToken: 'test-token',
        user: {
          id: 'user-1',
          email: 'user@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: role as Role,
        },
        role,
        pendingMfaUserId: null,
        pendingVerifyUserId: null,
        isAuthenticated: true,
      },
    },
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar />
      </MemoryRouter>
    </Provider>
  );
};

describe('Sidebar — Chamber Network nav item is member-role-only (AC1)', () => {
  it('shows "Chamber Network" for role=member', async () => {
    renderSidebarForRole('member');
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
    expect(screen.getByText('Chamber Network')).toBeInTheDocument();
  });

  it('shows "Chamber Network" when role is null (unresolved/default falls back to member items)', async () => {
    renderSidebarForRole(null);
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
    expect(screen.getByText('Chamber Network')).toBeInTheDocument();
  });

  const otherRoles: Role[] = [
    'staff_operator',
    'chamber_admin',
    'chamber_executive',
    'institutional_subscriber',
    'super_admin',
  ];

  it.each(otherRoles)('does NOT show "Chamber Network" for role=%s', async (role) => {
    renderSidebarForRole(role);
    await waitFor(() => expect(screen.getAllByRole('link').length).toBeGreaterThan(0));
    expect(screen.queryByText('Chamber Network')).not.toBeInTheDocument();
  });

  it('still shows the pre-existing "My Chambers" nav item for every role (unaffected by this feature)', async () => {
    for (const role of [...otherRoles, 'member' as Role]) {
      const { unmount } = renderSidebarForRole(role);
      await waitFor(() => expect(screen.getByText('My Chambers')).toBeInTheDocument());
      unmount();
    }
  });
});

describe('Sidebar — chamber-scoped modules hidden for a zero-connection member', () => {
  it('hides Trade Fair/Academy/Membership/Trade Corridors/Exporter Visibility/Export Documents at 0 connections', async () => {
    connectionsFixture = [];
    renderSidebarForRole('member');
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());

    for (const label of ['Trade Fair', 'Academy', 'Membership', 'Trade Corridors', 'Exporter Visibility', 'Export Documents']) {
      expect(screen.queryByText(label)).not.toBeInTheDocument();
    }
    // Always-visible items stay visible regardless of connection count.
    for (const label of ['Dashboard', 'eCO Certificates', 'My Chambers', 'Chamber Network', 'My Profile']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('shows the gated modules once ≥1 connection exists, even in a non-active status', async () => {
    connectionsFixture = [{ tenantId: 'tenant-a', status: 'suspended' }];
    renderSidebarForRole('member');
    // Dashboard is always visible regardless of query state, so wait on a
    // GATED item instead — that's the one that depends on the connections
    // fetch actually resolving before we assert.
    await waitFor(() => expect(screen.getByText('Trade Fair')).toBeInTheDocument());

    for (const label of ['Academy', 'Membership', 'Trade Corridors', 'Exporter Visibility', 'Export Documents']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('does not gate any other role — chamber_admin sees Trade Fair/Academy regardless of connection count', async () => {
    connectionsFixture = [];
    renderSidebarForRole('chamber_admin');
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
    expect(screen.getByText('Trade Fair')).toBeInTheDocument();
    expect(screen.getByText('Academy')).toBeInTheDocument();
  });
});

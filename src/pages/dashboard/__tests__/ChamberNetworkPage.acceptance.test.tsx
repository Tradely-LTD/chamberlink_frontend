/**
 * Acceptance test — Chamber Network page (ChamberNetworkPage) + the
 * ConnectViaRosterModal it opens.
 *
 * Mounts the real component tree inside a real Redux store + real RTK Query
 * emptyApi + real react-router, mocking only the network boundary
 * (global.fetch), mirroring the convention EcoApplyPage.acceptance.test.tsx
 * already established for this repo.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { emptyApi } from '@shared/api/emptyApi';
import authReducer from '@features/auth/authSlice';
import { ChamberNetworkPage } from '../ChamberNetworkPage';

const jsonResponse = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  );

const CHAMBERS = [
  { id: 'tenant-a', name: 'Lagos Chamber of Commerce', slug: 'lagos', city: 'Lagos' },
  { id: 'tenant-b', name: 'Kano Chamber of Commerce', slug: 'kano', city: 'Kano' },
];

const CONNECTIONS = [
  {
    tenantId: 'tenant-b',
    tenantName: 'Kano Chamber of Commerce',
    tenantSlug: 'kano',
    tenantLogoUrl: null,
    memberId: 'KANO-2024-0001',
    status: 'active',
    tierId: 't1',
    tierName: 'Ordinary',
    memberSince: '2024-01-01T00:00:00Z',
    expiresAt: '2027-01-01T00:00:00Z',
    isActive: true,
  },
];

let checkRosterCalls: { tenantId: string; legacyMemberId: string }[];
let connectRosterCalls: { tenantId: string; legacyMemberId: string }[];
let checkRosterResponse: { status: number; body: unknown };
let connectRosterResponse: { status: number; body: unknown };

const installFetchMock = () => {
  checkRosterCalls = [];
  connectRosterCalls = [];
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const request = input instanceof Request ? input : new Request(input as string);
    const url = request.url;
    const method = request.method.toUpperCase();

    if (url.includes('/tenants/public/onboarded')) {
      return jsonResponse({ success: true, data: CHAMBERS });
    }
    if (url.includes('/membership/connections') && !url.includes('/roster') && method === 'GET') {
      return jsonResponse({ success: true, data: CONNECTIONS });
    }
    if (url.includes('/membership/connections/roster/check') && method === 'POST') {
      const body = await request.clone().json();
      checkRosterCalls.push(body);
      return jsonResponse(checkRosterResponse.body, checkRosterResponse.status);
    }
    if (url.endsWith('/membership/connections/roster') && method === 'POST') {
      const body = await request.clone().json();
      connectRosterCalls.push(body);
      return jsonResponse(connectRosterResponse.body, connectRosterResponse.status);
    }
    throw new Error(`Unexpected fetch in ChamberNetworkPage acceptance test: ${method} ${url}`);
  }) as unknown as typeof fetch;
};

const renderPage = () => {
  const store = configureStore({
    reducer: { auth: authReducer, [emptyApi.reducerPath]: emptyApi.reducer },
    middleware: (getDefault) => getDefault().concat(emptyApi.middleware),
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/dashboard/chamber-network']}>
        <Routes>
          <Route path="/dashboard/chamber-network" element={<ChamberNetworkPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
};

beforeEach(() => {
  installFetchMock();
  checkRosterResponse = { status: 200, body: { success: true, data: { matched: false } } };
  connectRosterResponse = { status: 201, body: { success: true, data: {}, message: 'created' } };
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('ChamberNetworkPage — lists only chambers the user is not already connected to', () => {
  it('shows Lagos (not connected) but hides Kano (already connected)', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Lagos Chamber of Commerce')).toBeInTheDocument());
    expect(screen.queryByText('Kano Chamber of Commerce')).not.toBeInTheDocument();
  });
});

describe('ChamberNetworkPage — Connect via roster ID happy path', () => {
  it('checks the ID, shows the masked preview, confirms, and shows the success toast', async () => {
    checkRosterResponse = {
      status: 200,
      body: {
        success: true,
        data: {
          matched: true,
          preview: {
            firstNameMasked: 'Amina B.',
            businessName: 'Acme Traders Ltd',
            tierName: 'Ordinary',
            memberSince: '2019-01-01T00:00:00Z',
          },
        },
      },
    };

    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText('Lagos Chamber of Commerce')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Connect with existing ID' }));
    await user.type(screen.getByLabelText('Existing Member ID'), 'LCC-2019-0042');
    await user.click(screen.getByRole('button', { name: 'Check ID' }));

    await waitFor(() => expect(screen.getByText('Is this you?')).toBeInTheDocument());
    expect(screen.getByText('Amina B.')).toBeInTheDocument();
    expect(screen.getByText('Acme Traders Ltd')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Confirm — this is me' }));

    await waitFor(() => expect(screen.getByText('Connected using your existing membership ID.')).toBeInTheDocument());
    expect(checkRosterCalls).toEqual([{ tenantId: 'tenant-a', legacyMemberId: 'LCC-2019-0042' }]);
    expect(connectRosterCalls).toEqual([{ tenantId: 'tenant-a', legacyMemberId: 'LCC-2019-0042' }]);
  });
});

describe('ChamberNetworkPage — no match found (not an error, inline message)', () => {
  it('shows an inline "no match" message instead of a toast/error boundary', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText('Lagos Chamber of Commerce')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Connect with existing ID' }));
    await user.type(screen.getByLabelText('Existing Member ID'), 'BOGUS-ID');
    await user.click(screen.getByRole('button', { name: 'Check ID' }));

    await waitFor(() =>
      expect(screen.getByText(/No match found — double-check the ID or contact the chamber\./)).toBeInTheDocument()
    );
  });
});

describe('ChamberNetworkPage — race condition: claimed by someone else between preview and confirm', () => {
  it('surfaces the 409 "already been claimed" message inline on the preview step, no retry loop', async () => {
    checkRosterResponse = {
      status: 200,
      body: {
        success: true,
        data: {
          matched: true,
          preview: {
            firstNameMasked: 'Amina B.',
            businessName: null,
            tierName: 'Ordinary',
            memberSince: null,
          },
        },
      },
    };
    connectRosterResponse = {
      status: 409,
      body: { success: false, message: 'This membership record has already been claimed.' },
    };

    const user = userEvent.setup();
    renderPage();
    await waitFor(() => expect(screen.getByText('Lagos Chamber of Commerce')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Connect with existing ID' }));
    await user.type(screen.getByLabelText('Existing Member ID'), 'LCC-2019-0042');
    await user.click(screen.getByRole('button', { name: 'Check ID' }));
    await waitFor(() => expect(screen.getByText('Is this you?')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Confirm — this is me' }));

    await waitFor(() =>
      expect(screen.getByText('This membership record has already been claimed.')).toBeInTheDocument()
    );
    // Still on the preview step — no auto-retry, no crash.
    expect(screen.getByText('Is this you?')).toBeInTheDocument();
  });
});

describe('ChamberNetworkPage — all onboarded chambers already connected', () => {
  it('shows the distinct "connected to every chamber" empty state', async () => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const request = input instanceof Request ? input : new Request(input as string);
      const url = request.url;
      if (url.includes('/tenants/public/onboarded')) {
        return jsonResponse({ success: true, data: [CHAMBERS[1]] }); // only Kano onboarded
      }
      if (url.includes('/membership/connections') && !url.includes('/roster')) {
        return jsonResponse({ success: true, data: CONNECTIONS }); // already connected to Kano
      }
      throw new Error(`Unexpected fetch: ${url}`);
    }) as unknown as typeof fetch;

    renderPage();
    await waitFor(() =>
      expect(screen.getByText("You're connected to every onboarded chamber")).toBeInTheDocument()
    );
  });
});

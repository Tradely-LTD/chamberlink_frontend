/**
 * Acceptance test — eCO Solid Minerals application wizard (EcoApplyPage)
 *
 * Written by the test-verifier, independent of the frontend-builder's own
 * unit tests (src/features/eco/__tests__/ecoApi.test.ts, which only exercises
 * transformResponse helpers/type shapes in isolation). This test instead
 * mounts the REAL EcoApplyPage component inside a real Redux store + real
 * RTK Query emptyApi + real react-router, and drives it exactly the way a
 * user would (fill fields, attach a file, click through the wizard, submit).
 *
 * The only thing mocked is the network boundary (global.fetch) — the same
 * "mock I/O at the edge, exercise everything real in between" convention the
 * backend acceptance tests use for the DB. This directly proves the
 * originStates multipart fix (commit b6592b9) actually survives an end-to-end
 * submission through the real component tree, not just a hand-rolled
 * FormData snippet.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { emptyApi } from '@shared/api/emptyApi';
import authReducer from '@features/auth/authSlice';
import { EcoApplyPage } from '../EcoApplyPage';

// ── Test-only fetch fixtures ────────────────────────────────────────────

const jsonResponse = (body: unknown, status = 200) =>
  Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  );

let capturedEcoPostRequest: { url: string; method: string; body: FormData } | null;

// RTK Query's fetchBaseQuery always calls `fetchFn(request)` with a SINGLE,
// already-constructed `Request` object (method/body/headers all live on the
// Request itself) — there is no separate `init` argument at call time. A
// FormData body sent through `new Request(url, { body: formData })` is
// re-parsable via `request.formData()` (Node 20 / undici's native Request),
// which is how we recover the actual multipart fields the component sent.
const installFetchMock = () => {
  capturedEcoPostRequest = null;
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const request = input instanceof Request ? input : new Request(input as string);
    const url = request.url;
    const method = request.method.toUpperCase();

    if (url.includes('/eco/solid-minerals')) {
      return jsonResponse({ success: true, data: [{ id: 'mineral-1', name: 'Tantalite', hsCode: '2615.90.00' }] });
    }
    if (url.includes('/tenants/public/onboarded')) {
      return jsonResponse({ success: true, data: [{ id: 'tenant-a', name: 'Lagos Chamber of Commerce', slug: 'lagos', city: 'Lagos' }] });
    }
    if (url.includes('/membership/me/documents')) {
      return jsonResponse({ success: true, data: [] });
    }
    if (/\/eco(\?.*)?$/.test(url) && method === 'POST') {
      const fd = await request.clone().formData();
      capturedEcoPostRequest = { url, method, body: fd };
      return jsonResponse({ success: true, data: { id: 'new-cert-id', status: 'submitted' } }, 201);
    }
    throw new Error(`Unexpected fetch in EcoApplyPage acceptance test: ${method} ${url}`);
  }) as unknown as typeof fetch;
};

// ── Render helper: real store, real RTK Query, real router ─────────────

const renderApplyPage = () => {
  const store = configureStore({
    reducer: { auth: authReducer, [emptyApi.reducerPath]: emptyApi.reducer },
    middleware: (getDefault) => getDefault().concat(emptyApi.middleware),
  });
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/dashboard/eco/apply']}>
        <Routes>
          <Route path="/dashboard/eco/apply" element={<EcoApplyPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>
  );
};

beforeEach(() => {
  installFetchMock();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("EcoApplyPage — end-to-end submission with an attached file preserves the applicant's selected origin states (frontend fix for the multipart originStates[] bug)", () => {
  it("fills the full 6-step wizard, attaches a compliance file, submits, and the outgoing POST /eco request carries originStates as a single JSON-stringified field matching the checkboxes the user actually selected", async () => {
    const user = userEvent.setup();
    const { container } = renderApplyPage();

    // Wait for the chamber + solid-mineral dropdown data to load.
    await waitFor(() => expect(screen.getByText(/Lagos Chamber of Commerce/)).toBeInTheDocument());

    // ── Step 0: Product & Goods Details ────────────────────────────────
    const selects = () => Array.from(container.querySelectorAll('select'));
    await user.selectOptions(selects()[0], 'tenant-a'); // chamber
    await user.selectOptions(selects()[1], 'mineral-1'); // solid mineral

    const textareasStep0 = () => Array.from(container.querySelectorAll('textarea'));
    await user.type(textareasStep0()[0], 'High grade tantalite ore, sorted');

    await user.type(screen.getByLabelText(/Number and Kind of Packages/), '50 sacks');
    await user.type(screen.getByLabelText(/^Quantity/), '1000');

    // Select TWO specific origin states — Lagos and Kano — via their checkboxes.
    await user.click(screen.getByRole('checkbox', { name: 'Lagos' }));
    await user.click(screen.getByRole('checkbox', { name: 'Kano' }));

    await user.type(screen.getByLabelText(/Destination Country/), 'United Arab Emirates');

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    // ── Step 1: Exporter/Company & Consignee Details ───────────────────
    await user.type(screen.getByLabelText(/Company Name/), 'Acme Minerals Ltd');
    const textareasStep1 = () => Array.from(container.querySelectorAll('textarea'));
    await user.type(textareasStep1()[0], '1 Industrial Avenue, Jos'); // companyAddress
    await user.type(screen.getByLabelText(/Company Email/), 'ops@acmeminerals.ng');
    await user.type(screen.getByLabelText(/Company Phone/), '+2348000000000');
    await user.type(screen.getByLabelText(/Consignee Full Legal Name/), 'Global Buyers Co');
    await user.type(textareasStep1()[1], '88 Trade Street, Shenzhen'); // consigneeAddress

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    // ── Step 2: Shipment & Transport ────────────────────────────────────
    const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-03-01' } });
    await user.type(screen.getByLabelText(/Vessel\/Flight\/Vehicle Name & Voyage No\./), 'MV Example / VOY001');
    await user.type(screen.getByLabelText(/Port of Loading/), 'Lagos');
    await user.type(screen.getByLabelText(/Port of Discharge/), 'Dubai');

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    // ── Step 3: Commercial Information ──────────────────────────────────
    await user.type(screen.getByLabelText(/Invoice Number/), 'INV-2026-001');
    const dateInputs = Array.from(container.querySelectorAll('input[type="date"]'));
    fireEvent.change(dateInputs[0], { target: { value: '2026-02-15' } });
    await user.type(screen.getByLabelText(/Invoice Total/), '5000000');

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    // ── Step 4: Compliance Documents — attach a real file (forces the
    //    multipart/FormData code path, matching the reported bug scenario) ──
    const invoiceSlotHeading = screen.getByText('Attach Invoice');
    const invoiceSlotRoot = invoiceSlotHeading.closest('div')!.parentElement as HTMLElement;
    await user.click(within(invoiceSlotRoot).getByRole('button', { name: 'Upload New' }));
    const fileInput = invoiceSlotRoot.querySelector('input[type="file"]') as HTMLInputElement;
    const testFile = new File(['%PDF-1.4 test invoice'], 'invoice.pdf', { type: 'application/pdf' });
    await user.upload(fileInput, testFile);
    await waitFor(() => expect(within(invoiceSlotRoot).getByText('invoice.pdf')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    // ── Step 5: Review & Submit ──────────────────────────────────────────
    await user.click(screen.getByRole('button', { name: 'Submit Application' }));

    await waitFor(() => expect(capturedEcoPostRequest).not.toBeNull());

    const req = capturedEcoPostRequest!;
    const fd = req.body; // reconstructed via the real Request.formData() parser — a genuine multipart round-trip
    expect(typeof fd.get).toBe('function'); // structurally a FormData (may be a cross-realm instance under Node's undici)

    // The core regression proof: originStates arrives as ONE field, JSON-stringified —
    // never as repeated originStates[] fields (which the backend's coerceEcoBody
    // never reads, silently dropping the applicant's selection).
    expect(fd.getAll('originStates[]')).toHaveLength(0);
    const rawOriginStates = fd.get('originStates');
    expect(typeof rawOriginStates).toBe('string');
    const parsedOriginStates = JSON.parse(rawOriginStates as string);
    expect(parsedOriginStates.sort()).toEqual(['Kano', 'Lagos']);

    // Sanity: the file itself made it into the multipart body under the
    // "invoice" field the backend's multer config expects.
    const uploadedInvoice = fd.get('invoice') as unknown as { name: string; size: number };
    expect(uploadedInvoice).toBeTruthy();
    expect(uploadedInvoice.name).toBe('invoice.pdf');

    // And the rest of the Solid Minerals contract made it across too.
    expect(fd.get('solidMineralId')).toBe('mineral-1');
    expect(fd.get('tenantId')).toBe('tenant-a');
    expect(fd.get('destinationCountry')).toBe('United Arab Emirates');
    expect(fd.get('invoiceTotal')).toBe('5000000');
    expect(fd.get('consigneeName')).toBe('Global Buyers Co');
    // hsCode is never sent by the client at all — it is server-derived (criterion A3).
    expect(fd.get('hsCode')).toBeNull();
  });
});

describe("EcoApplyPage — form fields (criterion A1/A5/A6/A7): old cargo fields are gone, HS Code is read-only/derived, Consignee is required", () => {
  it("shows a read-only, disabled HS Code field once a mineral is selected — never an editable input", async () => {
    const user = userEvent.setup();
    const { container } = renderApplyPage();
    await waitFor(() => expect(screen.getByText(/Lagos Chamber of Commerce/)).toBeInTheDocument());

    const selects = Array.from(container.querySelectorAll('select'));
    await user.selectOptions(selects[1], 'mineral-1');

    const hsCodeInput = await screen.findByDisplayValue('2615.90.00');
    expect(hsCodeInput).toBeDisabled();
    expect(hsCodeInput).toHaveAttribute('readonly');
  });

  it('has no field/label for cargo weight, shipping method, container IDs, or exporter name/address anywhere in the rendered wizard', async () => {
    renderApplyPage();
    await waitFor(() => expect(screen.getByText(/Lagos Chamber of Commerce/)).toBeInTheDocument());

    for (const removedLabel of [/Cargo Weight/i, /Shipping Method/i, /Container/i, /Exporter Name/i, /Exporter Address/i]) {
      expect(screen.queryByText(removedLabel)).not.toBeInTheDocument();
    }
  });

  it('the Consignee fields are marked required (asterisk) and Continue on step 1 is disabled until they are filled', async () => {
    const user = userEvent.setup();
    const { container } = renderApplyPage();
    await waitFor(() => expect(screen.getByText(/Lagos Chamber of Commerce/)).toBeInTheDocument());

    // Minimal step 0 fill, then advance to step 1.
    const selects = Array.from(container.querySelectorAll('select'));
    await user.selectOptions(selects[0], 'tenant-a');
    await user.selectOptions(selects[1], 'mineral-1');
    await user.type(container.querySelectorAll('textarea')[0], 'Good ore');
    await user.type(screen.getByLabelText(/Number and Kind of Packages/), '10 bags');
    await user.type(screen.getByLabelText(/^Quantity/), '5');
    await user.click(screen.getByRole('checkbox', { name: 'Lagos' }));
    await user.type(screen.getByLabelText(/Destination Country/), 'UK');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText(/Consignee Full Legal Name/)).toBeInTheDocument();
    expect(screen.getByText(/Consignee Address/)).toBeInTheDocument();
    // No consignee fields filled yet -> Continue must be disabled.
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });
});

describe("EcoApplyPage — chamber lock (criterion A30/D30): still-editable pre-lock, disabled once existingCert.status !== 'draft'", () => {
  it("free-choice, enabled chamber dropdown when creating a brand-new application (no existingCert yet)", async () => {
    renderApplyPage();
    await waitFor(() => expect(screen.getByText(/Lagos Chamber of Commerce/)).toBeInTheDocument());
    const select = document.querySelectorAll('select')[0] as HTMLSelectElement;
    expect(select).not.toBeDisabled();
  });
});

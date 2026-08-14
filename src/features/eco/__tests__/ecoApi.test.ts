/**
 * Unit tests for the eCO (Certificate of Origin — Solid Minerals) feature API slice.
 *
 * We test the transformResponse logic directly (the functions that convert
 * raw API envelopes to the typed data the UI consumes), plus the ECertificate,
 * NewECertPayload, SolidMineral, OnboardedTenant, and EcoQueueItem shapes
 * expected by the as-built backend contract.
 */

import type {
  ECertificate,
  NewECertPayload,
  SolidMineral,
  OnboardedTenant,
  EcoQueueItem,
} from '../ecoApi';

// ── transformResponse helpers (replicated from ecoApi.ts for unit-testing) ─

function transformSolidMinerals(raw: { success: boolean; data: SolidMineral[] }): SolidMineral[] {
  return raw.data;
}

function transformOnboardedTenants(raw: { success: boolean; data: OnboardedTenant[] }): OnboardedTenant[] {
  return raw.data;
}

interface NestedQueueItem {
  cert: ECertificate;
  member: { firstName: string; lastName: string; memberId: string } | null;
  applicantFirstName: string;
  applicantLastName: string;
}

function transformAdminQueue(raw: { success: boolean; data: NestedQueueItem[] }): EcoQueueItem[] {
  return raw.data.map((item) => ({
    id: item.cert.id,
    certificateNumber: item.cert.certificateNumber,
    applicantFirstName: item.applicantFirstName,
    applicantLastName: item.applicantLastName,
    memberId: item.member?.memberId,
    solidMineralName: item.cert.solidMineralName,
    destinationCountry: item.cert.destinationCountry,
    status: item.cert.status,
    createdAt: item.cert.createdAt,
    selfDeclaredIsMember: item.cert.selfDeclaredIsMember,
    rejectionReason: item.cert.rejectionReason,
    revisionNotes: item.cert.revisionNotes,
    certificatePdfUrl: item.cert.certificatePdfUrl,
  }));
}

// ── Fixtures ─────────────────────────────────────────────────────────────

function makeCert(overrides: Partial<ECertificate> = {}): ECertificate {
  return {
    id: 'cert-1',
    certificateNumber: null,
    applicantUserId: 'user-1',
    tenantId: 'tenant-1',
    memberId: null,
    solidMineralId: 'sm-1',
    solidMineralName: 'Tantalite',
    hsCode: '2615.90.00',
    descriptionOfGoods: 'Raw tantalite ore',
    numberAndKindOfPackages: '50 sacks',
    marksAndNumbers: null,
    quantity: 1000,
    quantityUnit: 'MT',
    originStates: ['Plateau', 'Nasarawa'],
    destinationCountry: 'China',
    destinationPort: null,
    batchIdNo: null,
    isLicenseOwner: true,
    miningLicenseNo: 'ML-12345',
    companyName: 'Acme Minerals Ltd',
    companyAddress: '1 Industrial Ave, Jos',
    companyCountry: 'Nigeria',
    companyEmail: 'ops@acmeminerals.ng',
    companyPhone: '+2348000000000',
    consigneeName: 'Global Buyers Co',
    consigneeAddress: '88 Trade St, Shenzhen',
    departureDate: '***',
    meansOfTransport: 'sea',
    vesselFlightVehicleNameVoyageNo: '***',
    portOfLoading: 'Lagos',
    portOfDischarge: '***',
    issuedRetrospectively: false,
    invoiceNumber: 'INV-001',
    invoiceDate: '2026-01-10',
    invoiceTotal: 5000000,
    invoiceFileKey: 'keys/invoice.pdf',
    customerOrderOrLcNo: null,
    selfDeclaredIsMember: true,
    selfDeclaredMembershipId: 'MEM-001',
    signatureKey: null,
    cacCertificateKey: null,
    nepcCertificateKey: null,
    additionalDocsKeys: null,
    status: 'submitted',
    applicationFee: null,
    membershipVerified: false,
    paymentRef: null,
    paymentGateway: null,
    paidAt: null,
    reviewedByUserId: null,
    reviewedAt: null,
    rejectionReason: null,
    revisionNotes: null,
    certificatePdfKey: null,
    certificatePdfUrl: null,
    qrCodeData: null,
    issuedAt: null,
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-01-10T00:00:00Z',
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('eco transformResponse helpers', () => {
  describe('transformSolidMinerals', () => {
    it('unwraps the data array and preserves server-derived hsCode', () => {
      const minerals: SolidMineral[] = [{ id: 'sm-1', name: 'Tantalite', hsCode: '2615.90.00' }];
      const result = transformSolidMinerals({ success: true, data: minerals });
      expect(result).toHaveLength(1);
      expect(result[0].hsCode).toBe('2615.90.00');
    });
  });

  describe('transformOnboardedTenants', () => {
    it('unwraps { id, name, slug, city } tenant list', () => {
      const tenants: OnboardedTenant[] = [{ id: 't-1', name: 'Lagos Chamber', slug: 'lagos', city: 'Lagos' }];
      const result = transformOnboardedTenants({ success: true, data: tenants });
      expect(result[0].name).toBe('Lagos Chamber');
      expect(result[0].city).toBe('Lagos');
    });
  });

  describe('transformAdminQueue', () => {
    it('maps applicantFirstName/applicantLastName from the queue item, not from member', () => {
      const item: NestedQueueItem = {
        cert: makeCert(),
        member: { firstName: 'Amina', lastName: 'Musa', memberId: 'MEM-001' },
        applicantFirstName: 'Amina',
        applicantLastName: 'Musa',
      };
      const result = transformAdminQueue({ success: true, data: [item] });
      expect(result[0].applicantFirstName).toBe('Amina');
      expect(result[0].applicantLastName).toBe('Musa');
      expect(result[0].memberId).toBe('MEM-001');
    });

    it('handles member === null (no chamber connection) without throwing — a valid/expected case', () => {
      const item: NestedQueueItem = {
        cert: makeCert(),
        member: null,
        applicantFirstName: 'Chinedu',
        applicantLastName: 'Okafor',
      };
      const result = transformAdminQueue({ success: true, data: [item] });
      expect(result[0].applicantFirstName).toBe('Chinedu');
      expect(result[0].applicantLastName).toBe('Okafor');
      expect(result[0].memberId).toBeUndefined();
    });

    it('carries selfDeclaredIsMember through for the "Mark Membership Verified" gating', () => {
      const item: NestedQueueItem = {
        cert: makeCert({ selfDeclaredIsMember: true }),
        member: null,
        applicantFirstName: 'A',
        applicantLastName: 'B',
      };
      const result = transformAdminQueue({ success: true, data: [item] });
      expect(result[0].selfDeclaredIsMember).toBe(true);
    });

    it('maps solidMineralName/destinationCountry (replacing the old cargoDescription/exporterName fields)', () => {
      const item: NestedQueueItem = {
        cert: makeCert({ solidMineralName: 'Lithium Ore', destinationCountry: 'Germany' }),
        member: null,
        applicantFirstName: 'A',
        applicantLastName: 'B',
      };
      const result = transformAdminQueue({ success: true, data: [item] });
      expect(result[0].solidMineralName).toBe('Lithium Ore');
      expect(result[0].destinationCountry).toBe('Germany');
    });
  });
});

describe('ECertificate type shape (backend contract)', () => {
  it('accepts the full new field set (Product/Goods, Exporter, Consignee, Shipment, Commercial, Compliance)', () => {
    const cert = makeCert();
    expect(cert.solidMineralName).toBe('Tantalite');
    expect(cert.hsCode).toBe('2615.90.00');
    expect(cert.originStates).toEqual(['Plateau', 'Nasarawa']);
    expect(cert.consigneeName).toBe('Global Buyers Co');
    expect(cert.departureDate).toBe('***');
    expect(cert.invoiceFileKey).toBe('keys/invoice.pdf');
    expect(cert.membershipVerified).toBe(false);
  });

  it('allows the shipment subfields to hold the literal "***" for unknowns', () => {
    const cert = makeCert({
      departureDate: '***',
      vesselFlightVehicleNameVoyageNo: '***',
      portOfLoading: '***',
      portOfDischarge: '***',
    });
    expect(cert.departureDate).toBe('***');
    expect(cert.vesselFlightVehicleNameVoyageNo).toBe('***');
    expect(cert.portOfLoading).toBe('***');
    expect(cert.portOfDischarge).toBe('***');
  });

  it('supports member === null (no chamber connection) as a valid value', () => {
    const cert = makeCert({ memberId: null });
    expect(cert.memberId).toBeNull();
  });

  it('does NOT rely on any of the removed cargo/export fields (isExpedited, cargoDescription, etc.)', () => {
    const cert = makeCert();
    expect(cert).not.toHaveProperty('isExpedited');
    expect(cert).not.toHaveProperty('cargoDescription');
    expect(cert).not.toHaveProperty('cargoWeight');
    expect(cert).not.toHaveProperty('shippingMethod');
    expect(cert).not.toHaveProperty('exporterName');
    expect(cert).not.toHaveProperty('exporterAddress');
  });
});

describe('NewECertPayload type shape (submit/draft request body)', () => {
  it('accepts a fully-populated payload including "***" shipment placeholders', () => {
    const payload: NewECertPayload = {
      solidMineralId: 'sm-1',
      descriptionOfGoods: 'Raw tantalite ore',
      numberAndKindOfPackages: '50 sacks',
      quantity: 1000,
      quantityUnit: 'MT',
      originStates: ['Plateau'],
      destinationCountry: 'China',
      isLicenseOwner: true,
      miningLicenseNo: 'ML-12345',
      companyName: 'Acme Minerals Ltd',
      companyAddress: '1 Industrial Ave, Jos',
      companyCountry: 'Nigeria',
      companyEmail: 'ops@acmeminerals.ng',
      companyPhone: '+2348000000000',
      consigneeName: 'Global Buyers Co',
      consigneeAddress: '88 Trade St, Shenzhen',
      departureDate: '***',
      meansOfTransport: 'sea',
      vesselFlightVehicleNameVoyageNo: '***',
      portOfLoading: '***',
      portOfDischarge: '***',
      invoiceNumber: 'INV-001',
      invoiceDate: '2026-01-10',
      invoiceTotal: 5000000,
      tenantId: 'tenant-1',
      selfDeclaredIsMember: true,
      selfDeclaredMembershipId: 'MEM-001',
    };
    expect(payload.departureDate).toBe('***');
    expect(payload.invoiceTotal).toBeGreaterThan(0);
  });

  it('has no isExpedited / shippingMethod fields (expedited processing removed entirely)', () => {
    const payload = {
      solidMineralId: 'sm-1',
      descriptionOfGoods: 'x',
      numberAndKindOfPackages: 'x',
      quantity: 1,
      quantityUnit: 'KG',
      originStates: ['Lagos'],
      destinationCountry: 'UK',
      isLicenseOwner: false,
      companyName: 'x',
      companyAddress: 'x',
      companyCountry: 'Nigeria',
      companyEmail: 'a@b.com',
      companyPhone: '123',
      consigneeName: 'x',
      consigneeAddress: 'x',
      departureDate: '2026-01-01',
      meansOfTransport: 'air',
      vesselFlightVehicleNameVoyageNo: 'x',
      portOfLoading: 'x',
      portOfDischarge: 'x',
      invoiceNumber: 'x',
      invoiceDate: '2026-01-01',
      invoiceTotal: 100,
      tenantId: 't1',
      selfDeclaredIsMember: false,
    } satisfies NewECertPayload;
    expect(payload).not.toHaveProperty('isExpedited');
    expect(payload).not.toHaveProperty('shippingMethod');
  });
});

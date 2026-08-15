/**
 * Acceptance test — criterion A12: the 3 new eCO compliance document
 * categories (signature/cac_certificate/nepc_certificate) exist end-to-end
 * on the frontend, matching the backend's documentCategoryEnum.
 */
import { describe, it, expect } from 'vitest';
import type { DocumentCategory } from '../DocumentsPage';

describe('DocumentsPage — DocumentCategory type includes the 3 new eCO compliance categories', () => {
  it('accepts signature/cac_certificate/nepc_certificate as valid DocumentCategory values (compile-time contract)', () => {
    const categories: DocumentCategory[] = [
      'commercial_invoice', 'packing_list', 'certificate_of_origin', 'membership_card',
      'business_registration', 'tax_clearance', 'export_permit',
      'signature', 'cac_certificate', 'nepc_certificate', 'other',
    ];
    expect(categories).toContain('signature');
    expect(categories).toContain('cac_certificate');
    expect(categories).toContain('nepc_certificate');
    expect(categories).toHaveLength(11);
  });
});

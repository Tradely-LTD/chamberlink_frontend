/**
 * Cross-repo contract check (test-verifier) — proves the frontend's
 * ChamberConnection type (entities/user/types.ts) actually matches the field
 * names/status enum the BACKEND'S ChamberConnection interface
 * (chamberlink_backend/src/services/chamberConnectionService.ts) declares,
 * not just that the frontend type is internally self-consistent (which is all
 * connectionsApi.test.ts's "backend contract" describe block can prove on its
 * own, since it only ever constructs objects of its own type).
 *
 * This is a static source-inspection check across the sibling repo — the same
 * technique chamberlink_backend's own acceptance suite already uses in reverse
 * (reading chamberlink_frontend/chamberlink_landingpage source from a backend
 * test). Both repos live under the same chamberlink/ parent, so the relative
 * path is stable in this monorepo-of-repos layout.
 */
import fs from 'fs';
import path from 'path';

const BACKEND_SERVICE_PATH = path.resolve(
  __dirname,
  '../../../../../chamberlink_backend/src/services/chamberConnectionService.ts'
);
const FRONTEND_TYPES_PATH = path.resolve(__dirname, '../../../entities/user/types.ts');

describe('ChamberConnection type shape matches the backend contract (cross-repo)', () => {
  it('backend chamberConnectionService.ts is reachable from this repo (sanity check for the path itself)', () => {
    expect(fs.existsSync(BACKEND_SERVICE_PATH)).toBe(true);
  });

  it('every field in the backend ChamberConnection interface has a same-named field in the frontend type', () => {
    const backendSrc = fs.readFileSync(BACKEND_SERVICE_PATH, 'utf-8');
    const frontendSrc = fs.readFileSync(FRONTEND_TYPES_PATH, 'utf-8');

    const backendIfaceMatch = backendSrc.match(/export interface ChamberConnection \{([^}]+)\}/);
    expect(backendIfaceMatch).not.toBeNull();
    const backendBody = backendIfaceMatch![1];

    const frontendIfaceMatch = frontendSrc.match(/export interface ChamberConnection \{([^}]+)\}/);
    expect(frontendIfaceMatch).not.toBeNull();
    const frontendBody = frontendIfaceMatch![1];

    // Field names are the identifiers before each ':' on their own line.
    const extractFieldNames = (body: string): string[] =>
      body
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.includes(':') && !line.startsWith('//') && !line.startsWith('*'))
        .map((line) => line.split(':')[0].trim().replace(/\?$/, ''));

    const backendFields = extractFieldNames(backendBody).sort();
    const frontendFields = extractFieldNames(frontendBody).sort();

    for (const field of backendFields) {
      expect(frontendFields).toContain(field);
    }
    // And no extra fields invented on the frontend side that the backend never sends.
    for (const field of frontendFields) {
      expect(backendFields).toContain(field);
    }
  });

  it('the status enum values match exactly (order-independent) between backend and frontend', () => {
    const backendSrc = fs.readFileSync(BACKEND_SERVICE_PATH, 'utf-8');
    const frontendSrc = fs.readFileSync(FRONTEND_TYPES_PATH, 'utf-8');

    // Frontend declares the literal union directly on the `status` field.
    const frontendStatusMatch = frontendSrc.match(
      /status:\s*'([^']+)'\s*\|\s*'([^']+)'\s*\|\s*'([^']+)'\s*\|\s*'([^']+)'/
    );
    expect(frontendStatusMatch).not.toBeNull();
    const frontendStatuses = frontendStatusMatch!.slice(1).sort();

    // Backend's ChamberConnection.status is typed as MemberProfile["status"] —
    // resolve that from the memberProfilesTable status pgEnum declaration.
    const membershipSchemaPath = path.resolve(
      path.dirname(BACKEND_SERVICE_PATH),
      '../db/schemas/membershipSchema.ts'
    );
    const schemaSrc = fs.readFileSync(membershipSchemaPath, 'utf-8');
    const enumMatch = schemaSrc.match(/membershipStatusEnum\s*=\s*pgEnum\([^,]+,\s*\[([\s\S]+?)\]\)/);
    expect(enumMatch).not.toBeNull();
    const backendStatuses = enumMatch![1]
      .split(',')
      .map((s) => s.trim().replace(/['"]/g, ''))
      .filter(Boolean)
      .sort();

    expect(frontendStatuses).toEqual(backendStatuses);
  });
});

import { isNoActiveChamberError } from '../apiErrors';

describe('isNoActiveChamberError', () => {
  it('returns true for a 404 with the exact "No active chamber connection" message', () => {
    const error = { status: 404, data: { message: 'No active chamber connection' } };
    expect(isNoActiveChamberError(error)).toBe(true);
  });

  it('returns false for a 404 with a different message', () => {
    const error = { status: 404, data: { message: 'Tenant not found or inactive' } };
    expect(isNoActiveChamberError(error)).toBe(false);
  });

  it('returns false for a non-404 status with the same message', () => {
    const error = { status: 500, data: { message: 'No active chamber connection' } };
    expect(isNoActiveChamberError(error)).toBe(false);
  });

  it('returns false for undefined/null errors', () => {
    expect(isNoActiveChamberError(undefined)).toBe(false);
    expect(isNoActiveChamberError(null)).toBe(false);
  });

  it('returns false for a generic network/serialized error with no data field', () => {
    expect(isNoActiveChamberError({ status: 'FETCH_ERROR', error: 'Failed to fetch' })).toBe(false);
  });

  it('returns false for a non-object error', () => {
    expect(isNoActiveChamberError('some string error')).toBe(false);
  });
});

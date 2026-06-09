import { tokenStorage } from '../tokenStorage';

describe('tokenStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no token is stored', () => {
    expect(tokenStorage.get()).toBeNull();
  });

  it('stores and retrieves a token', () => {
    tokenStorage.set('my-refresh-token');
    expect(tokenStorage.get()).toBe('my-refresh-token');
  });

  it('removes the token', () => {
    tokenStorage.set('my-refresh-token');
    tokenStorage.remove();
    expect(tokenStorage.get()).toBeNull();
  });

  it('overwrites an existing token', () => {
    tokenStorage.set('first-token');
    tokenStorage.set('second-token');
    expect(tokenStorage.get()).toBe('second-token');
  });
});

const KEY = 'chamberlink_refresh_token';

export const tokenStorage = {
  get: (): string | null => localStorage.getItem(KEY),
  set: (token: string): void => {
    localStorage.setItem(KEY, token);
  },
  remove: (): void => {
    localStorage.removeItem(KEY);
  },
};

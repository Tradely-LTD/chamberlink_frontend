const KEY = 'chamberlink_return_origin';

// Set only when a session arrives via the SSO handoff from chamberlink_website
// (see SsoHandoffPage). Lets logout send the user back to the site they
// actually signed in from, instead of always landing on this app's own
// /login. Absent for anyone who logs into the portal directly — logout
// falls back to /login as before.
export const returnOrigin = {
  get: (): string | null => localStorage.getItem(KEY),
  set: (origin: string): void => {
    localStorage.setItem(KEY, origin);
  },
  remove: (): void => {
    localStorage.removeItem(KEY);
  },
};

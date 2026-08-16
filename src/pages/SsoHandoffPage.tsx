import { useEffect } from 'react';
import { tokenStorage } from '@shared/utils/tokenStorage';

/**
 * Receives a signed-in handoff from chamberlink_website (the corporate site's
 * /login and /register pages). The refresh token travels in the URL fragment
 * — never sent to any server, unlike a query string — so it only ever exists
 * in this tab's memory once read.
 *
 * AppLoader only restores a session from tokenStorage on its own mount, so
 * after storing the token this does a hard navigation (not client-side
 * router.push) to /dashboard, which remounts AppLoader and lets its existing
 * restoreSession() flow exchange the token for a real session, same as any
 * returning visit.
 */
export function SsoHandoffPage() {
  useEffect(() => {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    const params = new URLSearchParams(hash);
    const refreshToken = params.get('rt');

    // Strip the token from the URL/history immediately, whether or not it was
    // present, so it never lingers in browser history.
    window.history.replaceState(null, '', '/sso');

    if (refreshToken) {
      tokenStorage.set(refreshToken);
      window.location.replace('/dashboard');
    } else {
      window.location.replace('/login');
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#fdf8f3] flex items-center justify-center">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#023293] border-t-transparent" />
    </div>
  );
}

import { useEffect } from 'react';
import { tokenStorage } from '@shared/utils/tokenStorage';
import { returnOrigin } from '@shared/utils/returnOrigin';

// Only ever store a well-formed http(s) origin — this value later feeds
// window.location.href on logout, so a malformed or javascript: value must
// never make it into storage.
function parseOrigin(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Receives a signed-in handoff from chamberlink_website (the corporate site's
 * /login and /register pages). Both values travel in the URL fragment —
 * never sent to any server, unlike a query string — so they only ever exist
 * in this tab's memory once read:
 *   - `rt`: the refresh token.
 *   - `from`: the origin the user signed in from, stored so logout can send
 *     them back there (see returnOrigin + Sidebar's handleLogout) instead of
 *     always landing on this app's own /login.
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
    const origin = parseOrigin(params.get('from'));

    // Strip the token from the URL/history immediately, whether or not it was
    // present, so it never lingers in browser history.
    window.history.replaceState(null, '', '/sso');

    if (refreshToken) {
      tokenStorage.set(refreshToken);
      if (origin) {
        returnOrigin.set(origin);
      } else {
        // No `from` this time — don't leave a stale origin from an earlier
        // handoff pointing logout somewhere this session didn't come from.
        returnOrigin.remove();
      }
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

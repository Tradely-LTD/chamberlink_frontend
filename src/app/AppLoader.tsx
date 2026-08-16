import { useEffect, useState } from 'react';
import { store } from './store';
import { tokenStorage } from '@shared/utils/tokenStorage';
import { setCredentials, logout } from '@features/auth/authSlice';

interface Props {
  children: React.ReactNode;
}

// Module-scoped, not component state — shared across every mount of AppLoader so a
// concurrent second invocation (React 18 StrictMode's deliberate double-invoke in dev,
// or two hard navigations landing close together in practice) awaits the same in-flight
// restore instead of firing its own redundant /auth/refresh call. Without this, two
// calls race with the *same* stale token: the backend correctly lets exactly one
// rotate it and 401s the other (that part is correct, expected security behavior) —
// but the "losing" call has no idea its sibling just succeeded, so it can't tell a
// real dead session from a same-token race and ends up undoing the login that the
// winner just established.
let restorePromise: Promise<void> | null = null;

async function restoreSession(): Promise<void> {
  const refreshToken = tokenStorage.get();
  if (!refreshToken) return;

  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL as string;
    const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!refreshRes.ok) {
      // Only a genuine 401 means this refresh token is actually dead (invalid,
      // expired, already rotated). Anything else — a transient 5xx, or this same
      // request getting aborted because the browser navigated away mid-flight —
      // says nothing about whether the token is still good, so don't destroy it
      // over that. Just don't authenticate this particular page load.
      if (refreshRes.status === 401) tokenStorage.remove();
      store.dispatch(logout());
      return;
    }

    const refreshJson = await refreshRes.json();
    const { accessToken, refreshToken: newRefreshToken } = refreshJson.data as {
      accessToken: string;
      refreshToken: string;
    };

    tokenStorage.set(newRefreshToken);

    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!meRes.ok) throw new Error('getMe failed');

    const meJson = await meRes.json();
    store.dispatch(setCredentials({ accessToken, user: meJson.data }));
  } catch {
    // Network error, abort, JSON parse failure, etc. — same soft-fail: leave the
    // stored refresh token alone so the next page load gets a real retry instead
    // of inheriting a session that's been silently destroyed for an unrelated
    // reason.
    store.dispatch(logout());
  }
}

// On page load, attempt to restore the session from the token store.
// If a valid refresh token exists, exchange it for a fresh access token.
// Shows a blank screen briefly (not a login redirect) while resolving.
export function AppLoader({ children }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const restore = async () => {
      // Already authenticated — either a prior mount already finished, or the
      // in-flight promise below just resolved it for us.
      if (store.getState().auth.isAuthenticated) {
        setReady(true);
        return;
      }

      if (!restorePromise) {
        restorePromise = restoreSession().finally(() => {
          restorePromise = null;
        });
      }
      await restorePromise;
      setReady(true);
    };

    restore();
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-surface-warm flex items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}

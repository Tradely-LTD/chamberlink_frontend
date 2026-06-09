import { useEffect, useState } from 'react';
import { store } from './store';
import { tokenStorage } from '@shared/utils/tokenStorage';
import { setCredentials, logout } from '@features/auth/authSlice';

interface Props {
  children: React.ReactNode;
}

// On page load, attempt to restore the session from the token store.
// If a valid refresh token exists, exchange it for a fresh access token.
// Shows a blank screen briefly (not a login redirect) while resolving.
export function AppLoader({ children }: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const restore = async () => {
      // Already authenticated (e.g. StrictMode second-run) — skip the restore
      if (store.getState().auth.isAuthenticated) {
        setReady(true);
        return;
      }

      const refreshToken = tokenStorage.get();
      if (!refreshToken) {
        setReady(true);
        return;
      }

      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL as string;
        const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!refreshRes.ok) throw new Error('Refresh failed');

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
        tokenStorage.remove();
        store.dispatch(logout());
      } finally {
        setReady(true);
      }
    };

    restore();
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#fdf8f3] flex items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-[#00502e] border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}

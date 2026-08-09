import {
  fetchBaseQuery,
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { tokenStorage } from '@shared/utils/tokenStorage';
import type { RootState } from '@app/store';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface AuthUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL as string,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

// Shared in-flight refresh promise — prevents multiple concurrent 401 handlers
// from each revoking the stored refresh token, which causes the logout race.
let refreshPromise: Promise<string | null> | null = null;

export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const refreshToken = tokenStorage.get();
    if (!refreshToken) {
      api.dispatch({ type: 'auth/logout' });
      tokenStorage.remove();
      const redirectTo = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.href = `/login?reason=session_expired&redirectTo=${redirectTo}`;
      return result;
    }

    // If a refresh is already in flight, wait for it instead of starting a second one.
    // This prevents the race where two concurrent 401s each try to rotate the same
    // refresh token — the second rotation fails (token revoked) and triggers logout.
    if (!refreshPromise) {
      refreshPromise = (async (): Promise<string | null> => {
        try {
          const refreshResult = await rawBaseQuery(
            { url: '/auth/refresh', method: 'POST', body: { refreshToken } },
            api,
            extraOptions
          );

          if (!refreshResult.data) {
            // Only a genuine 401 means this refresh token is actually dead. Anything
            // else — a transient 5xx, a network error, this request getting aborted —
            // says nothing about whether the token is still good, so don't destroy it
            // and force everyone back to /login over that.
            const status = (refreshResult.error as FetchBaseQueryError | undefined)?.status;
            if (status === 401) tokenStorage.remove();
            api.dispatch({ type: 'auth/logout' });
            const redirectTo = encodeURIComponent(window.location.pathname + window.location.search);
            window.location.href = `/login?reason=session_expired&redirectTo=${redirectTo}`;
            return null;
          }

          const tokens = (
            refreshResult.data as ApiEnvelope<{ accessToken: string; refreshToken: string }>
          ).data;
          tokenStorage.set(tokens.refreshToken);

          try {
            const meRes = await fetch(`${import.meta.env.VITE_API_BASE_URL as string}/auth/me`, {
              headers: { Authorization: `Bearer ${tokens.accessToken}` },
            });
            if (meRes.ok) {
              const meJson = (await meRes.json()) as { data: AuthUser };
              api.dispatch({
                type: 'auth/setCredentials',
                payload: { accessToken: tokens.accessToken, user: meJson.data },
              });
            }
          } catch {
            // non-critical — token is stored, next request will carry the new one
          }

          return tokens.accessToken;
        } catch {
          // Unexpected exception, not a normal error response — same soft-fail,
          // no real evidence the token itself is invalid.
          api.dispatch({ type: 'auth/logout' });
          const redirectTo = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.href = `/login?reason=session_expired&redirectTo=${redirectTo}`;
          return null;
        } finally {
          refreshPromise = null;
        }
      })();
    }

    const newToken = await refreshPromise;
    if (newToken) {
      result = await rawBaseQuery(args, api, extraOptions);
    }
  }

  return result;
};

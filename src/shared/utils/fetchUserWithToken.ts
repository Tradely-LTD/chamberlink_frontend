import type { AuthUser } from '@entities/user/types';

export async function fetchUserWithToken(accessToken: string): Promise<AuthUser> {
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL as string}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? 'Failed to fetch user');
  }
  const json = await res.json() as { data: AuthUser };
  return json.data;
}

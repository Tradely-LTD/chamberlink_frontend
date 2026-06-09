# KACCIMA Member Portal — Frontend Architecture

## Stack

- **React 18** + **Vite 5** + **TypeScript** (strict mode)
- **React Router v6** — `createBrowserRouter` + `RouterProvider`
- **Redux Toolkit** + **RTK Query** — single `emptyApi`, all endpoints injected
- **React Hook Form** + **Yup** + `@hookform/resolvers`
- **Tailwind CSS v3** (NOT v4)
- **Vitest** for unit/component tests
- **ESLint v8** (`.eslintrc.cjs`, NOT flat config)

---

## Feature-Sliced Design

```
src/
  app/           — store, router (bootstrapping layer)
  pages/         — route-level page components (thin wrappers)
  features/      — feature slices (auth, dashboard, …)
    auth/
      authSlice.ts
      authApi.ts
      schemas/
      components/
      index.ts
    dashboard/
      dashboardApi.ts
      components/
      index.ts
  entities/      — shared domain types (user, membership, …)
  shared/
    api/           — single emptyApi base
    guards/        — ProtectedRoute
    hooks/         — useAppDispatch, useAppSelector
    ui/            — presentational atoms (Button, Input, …)
    utils/         — tokenStorage
```

### Rules

1. **Single `emptyApi`** — `src/shared/api/emptyApi.ts` is the only `createApi` call. Every feature injects its endpoints via `emptyApi.injectEndpoints(...)`.
2. **No sibling imports** — features never import from each other. Shared domain types live in `entities/`. Shared utilities live in `shared/`.
3. **Index barrels** — every directory has an `index.ts` that re-exports its public surface.
4. **Pages are thin** — pages import from features; they contain no business logic.

---

## RBAC Roles

| Role | Description |
|---|---|
| `member` | Standard chamber member |
| `staff_operator` | Chamber staff with limited admin access |
| `institutional_subscriber` | Bank / institutional reader |
| `chamber_admin` | KACCIMA chamber administrator |
| `kaccima_executive` | Read-only analytics access |
| `super_admin` | Tradely platform administrator |

MFA is mandatory for `chamber_admin`, `kaccima_executive`, and `super_admin`.

---

## Token Storage Policy

| Token | Storage | Reason |
|---|---|---|
| `accessToken` | Redux state only (in-memory) | Never persisted; lost on page refresh (re-acquired via refresh flow) |
| `refreshToken` | `localStorage` via `tokenStorage.ts` | Only through the `tokenStorage` utility — no direct `localStorage` calls elsewhere |

**Never** store `accessToken` in `localStorage` or `sessionStorage`. **Never** log tokens, OTPs, or payment payloads.

---

## API Response Envelope

All backend responses are wrapped:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
```

RTK Query endpoints use `transformResponse` to unwrap `res.data` before returning.

---

## Auth Flow

1. **Login** — POST `/auth/login`
   - If `requiresMfa: true` → dispatch `setPendingMfa`, navigate to `/auth/mfa-verify`
   - If `requiresMfa: false` → store `refreshToken` via `tokenStorage`, fetch `/auth/me`, dispatch `setCredentials`, navigate to `/dashboard`
2. **Register** → POST `/auth/register` → dispatch `setPendingVerify`, navigate to `/auth/verify-email`
3. **Email verify** → POST `/auth/verify-email` → navigate to `/login`
4. **MFA verify** → POST `/auth/verify-mfa` → same flow as login success
5. **Token refresh** — `baseQueryWithReauth` in `authApi.ts` intercepts 401, reads `refreshToken` from `tokenStorage`, POSTs `/auth/refresh`, re-fetches `/auth/me`, re-dispatches `setCredentials`, retries the original request
6. **Logout** → POST `/auth/logout`, dispatch `logout()`, remove refresh token, navigate to `/login`

---

## Naming Conventions

- Components: `PascalCase.tsx`
- Hooks: `useXxx.ts`
- Slices: `xxxSlice.ts`
- API injections: `xxxApi.ts`
- Schemas: `xxxSchema.ts`
- Types: `types.ts` inside entity folder
- Barrel: `index.ts`

---

## Brand Colors

| Token | Value |
|---|---|
| Primary green | `#00502e` |
| Primary hover | `#006b3f` |
| Gold | `#795900` |
| Gold hover | `#5c4300` |
| Text dark | `#221a0f` |
| Text muted | `#8A7E6E` |
| Border | `#bec9bf` |
| Background cream | `#fdf8f3` |

---

## Performance

- RTK Query default caching (60s `keepUnusedDataFor`)
- Skeleton loaders on all async data (`SkeletonCard`)
- Error + retry on all queries (`onRetry` prop pattern)
- No heavy dependencies added without explicit instruction

---

## Security Checklist (pre-merge)

- [ ] No `accessToken` written to `localStorage` / `sessionStorage`
- [ ] No secrets in bundle (only `VITE_API_BASE_URL` publishable key)
- [ ] No console.log of tokens, OTPs, or payment data
- [ ] ProtectedRoute guards all authenticated routes
- [ ] Role-based redirect on `allowedRoles` mismatch
- [ ] Deep-link query params (`userId`, `token`) validated before use

# Frontend (Mobile) — Project Conventions

React Native + Expo + TypeScript. Architecture: see **`../architecture.md`**
(Feature-Sliced Atomic Design: atoms in `/components`, feature slices in
`/screens/[feature]_screens` with hooks/services/schema; RTK Query injected into
a single `emptyApi`).

## Installed skills (.claude/skills/)
- **frontend-security** — token storage (SecureStore, never plain AsyncStorage),
  no secrets in the bundle, deep-link/redirect validation.
- **mobile-offline-performance** — list jank, offline-first data, sync queues,
  optimistic updates. (Service workers/IndexedDB do NOT exist here.)
- **stitch-design** — document the design system into DESIGN.md and keep new
  screens on-brand.
- **frontend-design** (installed globally) — production-grade UI/component design.

## Reminders
- Components in `/components` are presentational only — no Redux/RTK/navigation.
  Business logic lives in `/screens/[feature]_screens/hooks`.
- Inject endpoints into `emptyApi`; never create a new RTK Query base API.
- `architecture.md` overrides these skills if they ever conflict.

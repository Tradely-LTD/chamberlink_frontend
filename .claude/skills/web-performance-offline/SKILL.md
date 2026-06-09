---
name: web-performance-offline
description: >-
  Performance and offline baseline for WEB apps — landing pages, marketing
  sites, and admin/dashboard portals (React/Vite and similar). Use this whenever
  a page loads slowly, scores poorly on Lighthouse/Core Web Vitals, needs PWA/
  offline support, has a large JS bundle, renders a huge table/list, or ships
  heavy images. Trigger on phrases like "the landing page is slow", "improve our
  Lighthouse score", "make this a PWA / work offline", "the bundle is huge",
  "the admin table lags with thousands of rows", "images are killing load time".
  IMPORTANT: this is the WEB skill — for a React Native mobile app use
  mobile-offline-performance instead (service workers and IndexedDB are web-only).
---

# Web Performance & Offline

A portable baseline for fast, resilient web apps. Two distinct goals live here:
**load fast** (the first paint and interactivity) and **stay usable offline**
(PWA behavior). Measure first, optimize the biggest number, repeat.

> **Measure first.** Run Lighthouse / check Core Web Vitals (LCP, CLS, INP)
> before changing anything. The three numbers tell you whether your problem is
> loading too much (LCP), layout shifting (CLS), or a heavy main thread (INP) —
> each has a different fix. Guessing wastes effort.

## How to use this skill

Loading problems are usually too much JavaScript or oversized images; runtime
jank is usually re-renders or un-virtualized lists; offline needs a service
worker plus a place to store data. Work from the symptom. Finish with the
checklist.

---

## 1. Loading performance (ship less, later)

- **Code-split by route.** Lazy-load route components (`React.lazy` + dynamic
  `import()`) so visitors download only the page they're on, not the whole app.
  This is the highest-leverage fix for a large bundle.
- **Tree-shake and trim dependencies.** Audit bundle size; a heavy date or icon
  library imported wholesale can dwarf your own code. Import only what you use.
- **Defer non-critical work.** Load below-the-fold widgets, analytics, and chat
  bubbles after first paint; mark non-essential scripts `defer`/`async`.

## 2. Asset optimization

- **Right-size and modernize images.** Serve responsive sizes (`srcset`) in
  modern formats (WebP/AVIF), lazy-load off-screen images (`loading="lazy"`), and
  always set width/height to prevent layout shift (CLS).
- **Compress at the edge.** Serve gzip/brotli and cache static assets with long
  `Cache-Control` + content hashing via your host/CDN.
- **Control fonts.** Subset, preload the critical font, and use `font-display:
  swap` so text isn't invisible while fonts load.

## 3. Offline & PWA

- **Use a service worker** (Workbox or the Vite PWA plugin — don't hand-roll one)
  to cache the app shell and static assets, giving instant repeat loads and an
  offline fallback page.
- **Store structured offline data in `IndexedDB`** (via a thin wrapper like `idb`)
  — it's the browser's real database; `localStorage` is tiny, synchronous, and
  string-only, so keep it for trivial flags.
- **Queue actions taken offline** and sync them when the connection returns
  (Background Sync API where supported).

## 4. Runtime & render

- **Virtualize large lists/tables.** A 5,000-row admin table should render only
  the visible rows (react-window / TanStack Virtual) — mounting them all is the
  classic dashboard freeze.
- **Cut unnecessary re-renders.** Memoize expensive components/values, keep props
  stable, and debounce high-frequency handlers (search-as-you-type, resize).

## 5. Network efficiency

- **Cache, dedupe, paginate.** Use a data layer (RTK Query / React Query) that
  dedupes in-flight requests and caches responses; paginate long lists; prefetch
  the next likely route/data on hover or idle.
- **Leverage HTTP caching/CDN** (ETag, `Cache-Control`) so repeat requests skip
  the network.

## 6. Perceived performance

- **Skeletons over spinners**, and optimistic updates for user actions, so the app
  feels fast even while data is in flight.

---

## Checklist

- [ ] Measured with Lighthouse / Core Web Vitals before optimizing
- [ ] Routes code-split; bundle audited; heavy deps trimmed; non-critical work deferred
- [ ] Images responsive + WebP/AVIF + lazy + dimensioned; assets compressed & CDN-cached; fonts controlled
- [ ] Service worker caches app shell + offline fallback; IndexedDB for offline data; offline actions queued
- [ ] Large lists/tables virtualized; re-renders memoized; high-frequency handlers debounced
- [ ] Requests cached/deduped/paginated; HTTP caching + CDN in use
- [ ] Skeletons + optimistic updates for perceived speed

---

## Notes for adapting across projects

- Map "React.lazy / Vite PWA / react-window" to the project's framework
  equivalents; the principles (split, cache, virtualize, measure) are universal.
- For a marketing/landing page, weight toward §1–§2 (load speed, Core Web
  Vitals); for an admin portal, weight toward §3–§5 (offline, virtualization,
  data caching).
- If the project's `architecture.md` fixes a stack, that wins.

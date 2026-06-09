---
name: frontend-security
description: >-
  Client-side security baseline for frontends — React Native mobile apps and web
  apps (landing pages, admin portals). Use this whenever storing auth tokens or
  user data on a device/browser, handling deep links or redirects, embedding API
  keys, rendering server/user content, configuring logout/session expiry, or
  reviewing a frontend for security. Trigger on phrases like "where do I store
  the JWT", "is it safe to keep the token in localStorage / AsyncStorage", "my
  API key is in the app", "validate this deep link", "is this dangerouslySetInnerHTML
  safe", "secure the login flow on the client". This is the CLIENT side; for
  server auth/authorization use backend-security.
---

# Frontend Security

A portable baseline for the security of code that runs on someone else's device
or browser. The one idea that drives everything here: **the client is a hostile,
fully-inspectable environment.** Anything you ship to it — code, "secrets", env
vars — is public and tamperable. So the client's job is to *store credentials
safely* and *not trust input*, while the real access decisions live on the
server (see backend-security).

## How to use this skill

When building or reviewing a frontend, walk these areas. The most common real
issues are: secrets baked into the bundle, tokens in insecure storage, and
trusting deep-link/redirect parameters. Finish with the checklist.

---

## 1. Secrets & API keys (the #1 frontend mistake)

- **There are no secrets in client code.** Anything in the JS bundle or app
  binary can be extracted. Never embed private API keys, signing secrets, or
  admin credentials in a frontend. Only *publishable* keys (designed to be
  public) belong here; everything sensitive goes behind your backend.
- **Strip secrets from build config.** On web, only variables explicitly meant to
  be public (e.g. `VITE_`/`NEXT_PUBLIC_` prefixes) reach the bundle — don't put
  private values there. On mobile, don't ship `.env` secrets in the binary.

## 2. Token & data storage

- **Mobile:** store tokens in the OS secure store — **`expo-secure-store`** /
  Keychain (iOS) / Keystore (Android) — never in plain AsyncStorage, which is
  unencrypted and readable on rooted devices.
- **Web:** prefer an **httpOnly, Secure, SameSite cookie** for the session token
  so JavaScript (and thus XSS) can't read it. If you must use `localStorage`,
  understand it's fully exposed to any XSS on the page — minimize what's there and
  keep tokens short-lived.
- **Clear on logout and expiry.** Wipe tokens and sensitive cache on logout, and
  handle token expiry/refresh so a stale session doesn't linger.

## 3. Untrusted input & output

- **Treat server and user data as untrusted.** On web, avoid
  `dangerouslySetInnerHTML`; if unavoidable, sanitize (DOMPurify). This is your
  defense against stored XSS.
- **Validate deep links and route params.** A deep link (`myapp://reset?token=…`)
  or a URL param is attacker-controllable — validate it, never execute or trust
  it blindly, and never auto-perform a sensitive action straight from a link.
- **Validate redirects.** Only navigate to allowlisted in-app routes/hosts, never
  to a raw user-supplied URL — open redirects enable phishing and token leakage.

## 4. Transport

- **HTTPS only.** No cleartext API calls. On mobile, consider certificate pinning
  for high-value apps to resist man-in-the-middle on hostile networks.

## 5. Don't leak through logs & build artifacts

- **No tokens or PII in logs**, and disable verbose/debug logging in production
  builds — device logs and browser consoles are readable.
- **Don't ship source maps publicly** in production if they'd expose your full
  unminified source; keep them private for error reporting.

## 6. Permissions & headers

- **Least privilege on mobile.** Request only the device permissions you actually
  use, at the moment you need them.
- **Set a Content-Security-Policy on web** to constrain what scripts/origins can
  run — a strong CSP is a powerful second line of defense against XSS.

---

## Checklist

- [ ] No private keys/secrets in the bundle or binary; only publishable keys client-side
- [ ] Mobile tokens in SecureStore/Keychain; web session in httpOnly cookie (or minimized, short-lived localStorage)
- [ ] Tokens/sensitive cache cleared on logout; expiry/refresh handled
- [ ] Server/user content sanitized; no unsafe HTML injection
- [ ] Deep links and redirects validated against an allowlist; no blind sensitive actions from links
- [ ] HTTPS everywhere; cert pinning considered for sensitive mobile apps
- [ ] No tokens/PII in logs; debug logging off in prod; source maps not public
- [ ] Least-privilege mobile permissions; CSP set on web

---

## Notes for adapting across projects

- The storage rule generalizes: "use the platform's secure, non-JS-readable
  store for credentials" — map to whatever the project/platform provides.
- This skill defends the client; it does not replace server-side authorization.
  Pair it with backend-security, which is where access is actually enforced.
- If the project's `architecture.md` defines auth/storage conventions, those win.

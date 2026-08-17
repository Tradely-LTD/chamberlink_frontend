/**
 * Sprint 1 Acceptance Tests — NACCIMA Member Portal
 *
 * These tests verify every acceptance criterion from the outside,
 * exercising the built artefacts without modifying implementation code.
 * They run in Node/jsdom via Vitest.
 */

import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve } from 'path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROOT = resolve(__dirname, '../..');          // naccima_frontend/
const SRC  = resolve(ROOT, 'src');

function src(...parts: string[]) { return resolve(SRC, ...parts); }
function root(...parts: string[]) { return resolve(ROOT, ...parts); }

function fileExists(path: string) { return existsSync(path); }
function readFile(path: string)   { return readFileSync(path, 'utf8'); }

function readSrc(...parts: string[]) { return readFile(src(...parts)); }


// ---------------------------------------------------------------------------
// AC-1: Scaffold
// ---------------------------------------------------------------------------

describe('AC-1: Scaffold', () => {
  it('AC-1.1 — package.json has required dependencies', () => {
    const pkg = JSON.parse(readFile(root('package.json')));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    // core runtime deps
    expect(deps['react']).toBeTruthy();
    expect(deps['react-dom']).toBeTruthy();
    expect(deps['react-router-dom']).toBeTruthy();
    expect(deps['@reduxjs/toolkit']).toBeTruthy();
    expect(deps['react-redux']).toBeTruthy();
    expect(deps['react-hook-form']).toBeTruthy();
    expect(deps['@hookform/resolvers']).toBeTruthy();
    expect(deps['yup']).toBeTruthy();

    // dev / tooling
    expect(deps['vite'] || deps['@vitejs/plugin-react']).toBeTruthy();
    expect(deps['typescript']).toBeTruthy();
    expect(deps['vitest']).toBeTruthy();
    expect(deps['@testing-library/react']).toBeTruthy();
    expect(deps['tailwindcss']).toBeTruthy();
  });

  it('AC-1.2 — vite.config.ts is valid (react plugin + path aliases present)', () => {
    const cfg = readFile(root('vite.config.ts'));
    expect(cfg).toContain("from 'vite'");
    expect(cfg).toContain("react()");
    expect(cfg).toContain('@app');
    expect(cfg).toContain('@shared');
    expect(cfg).toContain('@features');
    expect(cfg).toContain('@pages');
    expect(cfg).toContain('@entities');
  });

  it('AC-1.3 — typecheck script defined in package.json', () => {
    const pkg = JSON.parse(readFile(root('package.json')));
    expect(pkg.scripts?.typecheck).toBeTruthy();
  });

  it('AC-1.4 — lint script defined in package.json', () => {
    const pkg = JSON.parse(readFile(root('package.json')));
    expect(pkg.scripts?.lint).toBeTruthy();
  });

  it('AC-1.5 — architecture.md exists with required topics', () => {
    expect(fileExists(root('architecture.md'))).toBe(true);
    const md = readFile(root('architecture.md'));
    // FSD structure
    expect(md).toContain('app/');
    expect(md).toContain('pages/');
    expect(md).toContain('features/');
    expect(md).toContain('entities/');
    expect(md).toContain('shared/');
    // single emptyApi rule
    expect(md).toContain('emptyApi');
    // RBAC roles
    expect(md).toContain('member');
    expect(md).toContain('chamber_admin');
    expect(md).toContain('super_admin');
    // token storage policy
    expect(md).toContain('accessToken');
    expect(md).toContain('localStorage');
    expect(md).toContain('tokenStorage');
  });

  it('AC-1.6 — top-level FSD segments exist with index.ts', () => {
    for (const segment of ['app', 'pages', 'features', 'entities', 'shared']) {
      expect(fileExists(src(segment, 'index.ts')),
        `${segment}/index.ts missing`).toBe(true);
    }
  });

  it('AC-1.7 — single emptyApi in shared/api/emptyApi.ts using VITE_API_BASE_URL', () => {
    expect(fileExists(src('shared', 'api', 'emptyApi.ts'))).toBe(true);
    const code = readSrc('shared', 'api', 'emptyApi.ts');
    expect(code).toContain('createApi');
    // VITE_API_BASE_URL may be in emptyApi.ts directly or in its baseQuery helper
    const reauth = fileExists(src('shared', 'api', 'baseQueryWithReauth.ts'))
      ? readSrc('shared', 'api', 'baseQueryWithReauth.ts')
      : '';
    expect(code + reauth).toContain('VITE_API_BASE_URL');

    // No second createApi call in any file OTHER than emptyApi.ts
    
    const hits: string = (() => {
      try {
        return execSync(
          `grep -rn --include="*.ts" --include="*.tsx" "createApi(" "${SRC}"`,
          { encoding: 'utf8' }
        );
      } catch { return ''; }
    })();
    const lines = hits.trim().split('\n').filter(Boolean);
    // Every hit must come from emptyApi.ts — no other implementation file may call createApi(
    const offenders = lines.filter(l =>
      !l.includes('emptyApi.ts') &&
      !l.includes('acceptance.test.ts')
    );
    expect(offenders, `Second createApi( call found outside emptyApi.ts:\n${offenders.join('\n')}`).toHaveLength(0);
  });

  it('AC-1.8 — createBrowserRouter + RouterProvider wired in app/router.tsx', () => {
    expect(fileExists(src('app', 'router.tsx'))).toBe(true);
    const code = readSrc('app', 'router.tsx');
    expect(code).toContain('createBrowserRouter');
    // RouterProvider is used in main.tsx
    const main = readSrc('main.tsx');
    expect(main).toContain('RouterProvider');
    expect(main).toContain('router');
  });

  it('AC-1.9 — ProtectedRoute in shared/guards reads isAuthenticated and role', () => {
    const code = readSrc('shared', 'guards', 'ProtectedRoute.tsx');
    expect(code).toContain('isAuthenticated');
    expect(code).toContain('role');
  });

  it('AC-1.10 — .env.example exists, no .env with real secrets committed', () => {
    expect(fileExists(root('.env.example'))).toBe(true);
    // No .env committed (only .env.example is acceptable)
    const hasEnv = fileExists(root('.env'));
    if (hasEnv) {
      const env = readFile(root('.env'));
      // .env may exist but must not contain actual secret values (only placeholders)
      // VITE_API_BASE_URL=http://localhost… is not a secret
      const lines = env.split('\n').filter(l => l.trim() && !l.startsWith('#'));
      for (const line of lines) {
        const [, val] = line.split('=');
        // Reject anything that looks like a real key/token (long alphanumeric string)
        expect(val ?? '').not.toMatch(/^[A-Za-z0-9]{32,}$/);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// AC-2: Login Flow (static code checks)
// ---------------------------------------------------------------------------

describe('AC-2: Login Flow', () => {
  it('AC-2.1 — LoginForm exists with email, password, and submit', () => {
    const code = readSrc('features', 'auth', 'components', 'LoginForm.tsx');
    expect(code).toContain("type=\"email\"");
    expect(code).toContain("type=\"password\"");
    expect(code).toContain("type=\"submit\"");
  });

  it('AC-2.2 — email validation: required + format (schema)', () => {
    const schema = readSrc('features', 'auth', 'schemas', 'loginSchema.ts');
    expect(schema).toContain('.email(');
    expect(schema).toContain('.required(');
  });

  it('AC-2.3 — password required validation (schema)', () => {
    const schema = readSrc('features', 'auth', 'schemas', 'loginSchema.ts');
    expect(schema).toContain('password');
    expect(schema).toContain('.required(');
  });

  it('AC-2.4 — non-MFA path: stores accessToken in Redux, refreshToken via tokenStorage, navigates /dashboard', () => {
    const code = readSrc('features', 'auth', 'components', 'LoginForm.tsx');
    expect(code).toContain('tokenStorage.set');
    expect(code).toContain('setCredentials');
    expect(code).toContain("'/dashboard'");
    // accessToken must NOT be passed to tokenStorage directly
    expect(code).not.toMatch(/tokenStorage\.set\([^)]*accessToken/);
  });

  it('AC-2.5 — MFA path: dispatches setPendingMfa and navigates /auth/mfa-verify', () => {
    const code = readSrc('features', 'auth', 'components', 'LoginForm.tsx');
    expect(code).toContain('setPendingMfa');
    expect(code).toContain("'/auth/mfa-verify'");
  });

  it('AC-2.6 — 401 error shown without logging password or token', () => {
    const code = readSrc('features', 'auth', 'components', 'LoginForm.tsx');
    // Shows error
    expect(code).toContain('setError');
    // No console.log
    expect(code).not.toContain('console.log');
    // Does not log the password value
    expect(code).not.toMatch(/console\.\w+\([^)]*password/i);
    expect(code).not.toMatch(/console\.\w+\([^)]*accessToken/i);
  });

  it('AC-2.7 — loading state on submit button', () => {
    const code = readSrc('features', 'auth', 'components', 'LoginForm.tsx');
    expect(code).toContain('isLoading');
    expect(code).toContain('loading={isLoading}');
  });

  it('AC-2.8 — "Forgot password?" link navigates to /auth/forgot-password', () => {
    const code = readSrc('features', 'auth', 'components', 'LoginForm.tsx');
    expect(code).toContain('/auth/forgot-password');
  });

  it('AC-2.9 — "Register" link navigates to /register', () => {
    // The link itself now lives in AuthShell (rendered by LoginPage with
    // secondaryLinkTo="/register") rather than inside LoginForm — the two
    // pages' "New to Chamberlink? / Already have an account?" navigation
    // moved to the shared shell so it isn't duplicated by the form AND the
    // page wrapper. The behavior this criterion cares about (a reachable
    // /register link from the login screen) is unchanged.
    const code = readSrc('pages', 'LoginPage.tsx');
    expect(code).toContain('/register');
  });
});

// ---------------------------------------------------------------------------
// AC-3: Registration Flow
// ---------------------------------------------------------------------------

describe('AC-3: Registration Flow', () => {
  it('AC-3.1 — RegisterForm has all 6 fields', () => {
    const code = readSrc('features', 'auth', 'components', 'RegisterForm.tsx');
    expect(code).toContain("register('firstName')");
    expect(code).toContain("register('lastName')");
    expect(code).toContain("register('email')");
    expect(code).toContain("register('phone')");
    expect(code).toContain("register('password')");
    expect(code).toContain("register('confirmPassword')");
  });

  it('AC-3.2 — All 6 fields required in schema', () => {
    const schema = readSrc('features', 'auth', 'schemas', 'registerSchema.ts');
    const requiredCount = (schema.match(/\.required\(/g) ?? []).length;
    expect(requiredCount).toBeGreaterThanOrEqual(6);
  });

  it('AC-3.3 — Password: min 8, uppercase, lowercase, digit', () => {
    const schema = readSrc('features', 'auth', 'schemas', 'registerSchema.ts');
    expect(schema).toContain('.min(8');
    expect(schema).toContain('[A-Z]');
    expect(schema).toContain('[a-z]');
    expect(schema).toContain('[0-9]');
  });

  it('AC-3.4 — confirmPassword must match password', () => {
    const schema = readSrc('features', 'auth', 'schemas', 'registerSchema.ts');
    expect(schema).toContain("yup.ref('password')");
    expect(schema).toContain('Passwords do not match');
  });

  it('AC-3.5 — POST /auth/register → 201 → setPendingVerify → /auth/verify-email', () => {
    const api  = readSrc('features', 'auth', 'authApi.ts');
    const form = readSrc('features', 'auth', 'components', 'RegisterForm.tsx');
    expect(api).toContain('/auth/register');
    expect(form).toContain('setPendingVerify');
    expect(form).toContain('/auth/verify-email');
  });

  it('AC-3.6 — 409 → email field error with specific text', () => {
    const code = readSrc('features', 'auth', 'components', 'RegisterForm.tsx');
    expect(code).toContain('409');
    expect(code).toContain("setError('email'");
    expect(code).toContain('An account with this email already exists.');
  });

  it('AC-3.7 — Other errors → banner shown, no navigate away', () => {
    const code = readSrc('features', 'auth', 'components', 'RegisterForm.tsx');
    // root error used for banner
    expect(code).toContain("setError('root'");
    expect(code).toContain("errors.root");
  });
});

// ---------------------------------------------------------------------------
// AC-4: Email Verification
// ---------------------------------------------------------------------------

describe('AC-4: Email Verification', () => {
  it('AC-4.1 — VerifyEmailPage exists with OTP input + submit', () => {
    const page = readSrc('pages', 'VerifyEmailPage.tsx');
    expect(page).toContain('VerifyEmailForm');
    const form = readSrc('features', 'auth', 'components', 'VerifyEmailForm.tsx');
    expect(form).toContain('OtpInput');
    expect(form).toContain("type=\"submit\"");
  });

  it('AC-4.2 — POST /api/auth/verify-email with userId + code', () => {
    const api = readSrc('features', 'auth', 'authApi.ts');
    expect(api).toContain('/auth/verify-email');
    expect(api).toContain('userId');
    expect(api).toContain('code');
  });

  it('AC-4.3 — 200 → success message + redirect /login (auto 3s + manual button)', () => {
    const form = readSrc('features', 'auth', 'components', 'VerifyEmailForm.tsx');
    expect(form).toContain('setSuccess(true)');
    expect(form).toContain('3000');
    expect(form).toContain("navigate('/login')");
    expect(form).toContain('Go to Login');
  });

  it('AC-4.4 — 400/410 → error message displayed', () => {
    const form = readSrc('features', 'auth', 'components', 'VerifyEmailForm.tsx');
    expect(form).toContain('ErrorBanner');
    expect(form).toContain('errMsg');
  });

  it('AC-4 Guard — no pendingVerifyUserId → redirect to /register', () => {
    const page = readSrc('pages', 'VerifyEmailPage.tsx');
    expect(page).toContain('pendingVerifyUserId');
    expect(page).toContain('/register');
  });
});

// ---------------------------------------------------------------------------
// AC-5: MFA Verification
// ---------------------------------------------------------------------------

describe('AC-5: MFA Verification', () => {
  it('AC-5.1 — MfaVerifyPage exists; guard: no pendingMfaUserId → /login', () => {
    const page = readSrc('pages', 'MfaVerifyPage.tsx');
    expect(page).toContain('pendingMfaUserId');
    expect(page).toContain('/login');
  });

  it('AC-5.2 — OtpInput strips non-digits', () => {
    const otp = readSrc('shared', 'ui', 'OtpInput.tsx');
    expect(otp).toContain('replace(/\\D/g');
  });

  it('AC-5.3 — POST /auth/verify-mfa → 200 → store tokens + navigate /dashboard', () => {
    const api  = readSrc('features', 'auth', 'authApi.ts');
    const form = readSrc('features', 'auth', 'components', 'MfaVerifyForm.tsx');
    expect(api).toContain('/auth/verify-mfa');
    expect(form).toContain('tokenStorage.set');
    expect(form).toContain('setCredentials');
    expect(form).toContain("'/dashboard'");
  });

  it('AC-5.4 — 401 → error message + clear input', () => {
    const form = readSrc('features', 'auth', 'components', 'MfaVerifyForm.tsx');
    expect(form).toContain('setLocalError(');
    expect(form).toContain("setCode('')");
  });

  it('AC-5.5 — OTP never logged', () => {
    const form = readSrc('features', 'auth', 'components', 'MfaVerifyForm.tsx');
    expect(form).not.toContain('console.log');
    expect(form).not.toMatch(/console\.\w+\([^)]*code/i);
  });
});

// ---------------------------------------------------------------------------
// AC-6: Forgot / Reset Password
// ---------------------------------------------------------------------------

describe('AC-6: Forgot/Reset Password', () => {
  it('AC-6.1–6.3 — ForgotPasswordForm with email field and enumeration protection', () => {
    const form = readSrc('features', 'auth', 'components', 'ForgotPasswordForm.tsx');
    expect(form).toContain("register('email')");
    // Shows same success message regardless of error (enumeration protection)
    expect(form).toContain('setSubmitted(true)');
    // Always sets submitted in catch too
    expect(form).toContain('} catch {');
    expect(form).toContain('setSubmitted(true)');
    // Success message does not confirm email exists
    expect(form).toContain('If an account exists');
  });

  it('AC-6.4–6.7 — ResetPasswordPage reads token + userId from URL params', () => {
    const page = readSrc('pages', 'ResetPasswordPage.tsx');
    expect(page).toContain("searchParams.get('token')");
    expect(page).toContain("searchParams.get('userId')");
    // Redirects if params missing
    expect(page).toContain('/auth/forgot-password');
  });
});

// ---------------------------------------------------------------------------
// AC-7: Session Management
// ---------------------------------------------------------------------------

describe('AC-7: Session Management', () => {
  it('AC-7.1 — baseQueryWithReauth: 401 → refresh → retry original request', () => {
    // May live in authApi.ts or shared/api/baseQueryWithReauth.ts
    const reauthFile = fileExists(src('shared', 'api', 'baseQueryWithReauth.ts'))
      ? readSrc('shared', 'api', 'baseQueryWithReauth.ts')
      : readSrc('features', 'auth', 'authApi.ts');
    expect(reauthFile).toContain('401');
    expect(reauthFile).toContain('/auth/refresh');
    expect(reauthFile).toMatch(/rawBaseQuery\(args,|rawBaseQuery\(args /);
    // emptyApi must use the reauth wrapper as its baseQuery
    const emptyApiCode = readSrc('shared', 'api', 'emptyApi.ts');
    expect(emptyApiCode).toContain('baseQueryWithReauth');
  });

  it('AC-7.2 — Refresh fails → clear localStorage + Redux + redirect session_expired', () => {
    const reauthFile = fileExists(src('shared', 'api', 'baseQueryWithReauth.ts'))
      ? readSrc('shared', 'api', 'baseQueryWithReauth.ts')
      : readSrc('features', 'auth', 'authApi.ts');
    expect(reauthFile).toContain('tokenStorage.remove()');
    expect(reauthFile).toContain('session_expired');
  });

  it('AC-7.3 — Login page reads reason=session_expired and shows message', () => {
    const form = readSrc('features', 'auth', 'components', 'LoginForm.tsx');
    expect(form).toContain('session_expired');
    expect(form).toContain('Your session has expired');
  });

  it('AC-7.4 — Logout: clears Redux + localStorage + navigates /login', () => {
    const sidebar = readSrc('features', 'dashboard', 'components', 'Sidebar.tsx');
    expect(sidebar).toContain('dispatch(logout())');
    expect(sidebar).toContain('tokenStorage.remove()');
    expect(sidebar).toContain("navigate('/login')");
  });
});

// ---------------------------------------------------------------------------
// AC-8: Role-Gated Routing
// ---------------------------------------------------------------------------

describe('AC-8: Role-Gated Routing', () => {
  it('AC-8.1 — /dashboard/* wrapped in ProtectedRoute', () => {
    const router = readSrc('app', 'router.tsx');
    expect(router).toContain('ProtectedRoute');
    expect(router).toContain('/dashboard');
    // The router must have a children array containing /dashboard nested under ProtectedRoute.
    // Verify by checking that "children" follows the ProtectedRoute element definition
    // (i.e. the route object with element: <ProtectedRoute /> has a children key).
    const protectedElementIdx = router.indexOf('<ProtectedRoute');
    const childrenIdx = router.indexOf('children', protectedElementIdx);
    const dashboardAfterChildrenIdx = router.indexOf('/dashboard', childrenIdx);
    expect(protectedElementIdx).toBeGreaterThanOrEqual(0);
    expect(childrenIdx).toBeGreaterThan(protectedElementIdx);
    expect(dashboardAfterChildrenIdx).toBeGreaterThan(childrenIdx);
  });

  it('AC-8.2 — /unauthorized page exists', () => {
    expect(fileExists(src('pages', 'UnauthorizedPage.tsx'))).toBe(true);
    const router = readSrc('app', 'router.tsx');
    expect(router).toContain('/unauthorized');
  });

  it('AC-8.3 — Wrong role redirects to /unauthorized (not /login)', () => {
    const guard = readSrc('shared', 'guards', 'ProtectedRoute.tsx');
    // The guard must contain /unauthorized destination
    expect(guard).toContain('/unauthorized');
    const lines = guard.split('\n');
    // Find lines that handle the allowedRoles mismatch
    const roleLines = lines.filter(l => l.includes('allowedRoles'));
    expect(roleLines.length).toBeGreaterThan(0);
    // There must be a Navigate to /unauthorized somewhere in the file
    const unauthorizedLine = lines.find(l => l.includes('/unauthorized'));
    const loginLine = lines.find(l => l.includes('/login'));
    expect(unauthorizedLine).toBeDefined();
    expect(loginLine).toBeDefined();
    // The /unauthorized and /login redirects must be on different lines
    expect(unauthorizedLine).not.toEqual(loginLine);
    // The role-mismatch block must NOT navigate to /login
    // (the line with allowedRoles check must not also redirect to /login)
    const roleCheckLine = lines.find(
      l => l.includes('allowedRoles') && (l.includes('Navigate') || l.includes('return'))
    );
    if (roleCheckLine) {
      expect(roleCheckLine).not.toContain('/login');
    }
  });
});

// ---------------------------------------------------------------------------
// AC-9: Dashboard Shell
// ---------------------------------------------------------------------------

describe('AC-9: Dashboard Shell', () => {
  it('AC-9.1 — DashboardShell has sidebar + main layout', () => {
    const shell = readSrc('features', 'dashboard', 'components', 'DashboardShell.tsx');
    expect(shell).toContain('Sidebar');
    expect(shell).toContain('<main');
  });

  it('AC-9.2 — Sidebar has user name, role, and required nav links', () => {
    const sidebar = readSrc('features', 'dashboard', 'components', 'Sidebar.tsx');
    // User identity
    expect(sidebar).toContain('user.firstName');
    expect(sidebar).toContain('user.lastName');
    expect(sidebar).toContain('roleLabels');
    // Nav links
    expect(sidebar).toContain('Dashboard');
    expect(sidebar).toContain('My Profile');
    expect(sidebar).toContain('Membership');
    expect(sidebar).toContain('eCO Certificates');
    expect(sidebar).toContain('Trade Fair');
    expect(sidebar).toContain('Academy');
  });

  it('AC-9.3 — Every nav item is a live NavLink (no coming-soon placeholders left)', () => {
    // Sprint 1 shipped with some nav items disabled as "coming soon"; the product
    // has since shipped every one of those destinations as a real page, so the
    // criterion is now that nothing in the nav is disabled/placeholder anymore.
    const sidebar = readSrc('features', 'dashboard', 'components', 'Sidebar.tsx');
    expect(sidebar).not.toContain('cursor-not-allowed');
    expect(sidebar).toContain('NavLink');
  });

  it('AC-9.4 — OverviewPanel has welcome message, MembershipStatusCard, recent activity placeholder', () => {
    const overview = readSrc('features', 'dashboard', 'components', 'OverviewPanel.tsx');
    expect(overview).toContain('Welcome back');
    expect(overview).toContain('MembershipStatusCard');
    expect(overview).toContain('RecentActivityPlaceholder');
  });

  it('AC-9.5 — GET /membership/me on mount, skeleton while loading, retry on error', () => {
    const api  = readSrc('features', 'dashboard', 'dashboardApi.ts');
    const overview = readSrc('features', 'dashboard', 'components', 'OverviewPanel.tsx');
    const card = readSrc('features', 'dashboard', 'components', 'MembershipStatusCard.tsx');

    // Sprint 1 spec'd this as /members/profile; the backend shipped it as
    // /membership/me (mounted under the membership module) — matching that here.
    expect(api).toContain('/membership/me');
    expect(overview).toContain('isLoading');
    expect(card).toContain('SkeletonCard');
    expect(overview).toContain('refetch');
    expect(card).toContain('onRetry');
  });

  it('AC-9.6 — Responsive: MobileNav exists with hamburger below md breakpoint', () => {
    const shell  = readSrc('features', 'dashboard', 'components', 'DashboardShell.tsx');
    const mobile = readSrc('features', 'dashboard', 'components', 'MobileNav.tsx');
    // Desktop sidebar hidden below md
    expect(shell).toContain('md:flex');
    // Mobile nav is present
    expect(shell).toContain('MobileNav');
    // Hamburger button
    expect(mobile).toContain('Toggle menu');
    expect(mobile).toContain('md:hidden');
  });
});

// ---------------------------------------------------------------------------
// Security Checks
// ---------------------------------------------------------------------------

describe('Security', () => {
  it('No console.log in any source file (excluding acceptance test itself)', () => {
    
    let output = '';
    try {
      output = execSync(
        `grep -rn --include="*.ts" --include="*.tsx" "console\\.log" "${SRC}"`,
        { encoding: 'utf8' }
      );
    } catch {
      output = '';
    }
    // Filter out hits from this test file itself
    const lines = output.trim().split('\n').filter(l =>
      l.trim().length > 0 && !l.includes('acceptance.test.ts')
    );
    expect(lines, `console.log found in implementation files:\n${lines.join('\n')}`).toHaveLength(0);
  });

  it('accessToken never written to localStorage (only tokenStorage.ts may touch it)', () => {
    
    let output = '';
    try {
      output = execSync(
        `grep -rn --include="*.ts" --include="*.tsx" "localStorage" "${SRC}"`,
        { encoding: 'utf8' }
      );
    } catch {
      output = '';
    }
    const lines = output.trim().split('\n').filter(Boolean);
    // Only tokenStorage.ts and tokenStorage test may touch localStorage directly
    const offenders = lines.filter(l =>
      !l.includes('tokenStorage.ts') &&
      !l.includes('tokenStorage.test') &&
      !l.includes('acceptance.test.ts')
    );
    expect(offenders,
      `Direct localStorage access outside tokenStorage found:\n${offenders.join('\n')}`
    ).toHaveLength(0);
  });

  it('accessToken never stored via tokenStorage.set', () => {
    
    let output = '';
    try {
      output = execSync(
        `grep -rn --include="*.ts" --include="*.tsx" "tokenStorage\\.set" "${SRC}"`,
        { encoding: 'utf8' }
      );
    } catch {
      output = '';
    }
    const lines = output.trim().split('\n').filter(Boolean);
    for (const line of lines) {
      // tokenStorage.set must receive refreshToken, not accessToken
      expect(line, `Possible accessToken stored in localStorage via tokenStorage.set: ${line}`)
        .not.toMatch(/tokenStorage\.set\([^)]*accessToken/);
    }
  });
});

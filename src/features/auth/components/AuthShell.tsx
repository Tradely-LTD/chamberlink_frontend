import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';

// chamberlink_frontend has no public homepage of its own — "/" here is just
// a redirect straight back to /login (see app/router.tsx). The real "home"
// this app's brand mark should point to is the corporate marketing site
// (chamberlink_website), a separate repo/deployment — currently live on its
// Netlify subdomain, same pattern as this app's own chamberlinkadmin.netlify.app
// (chamberlink.ng is the custom domain the site's own code defaults to, but
// isn't the one actually serving traffic yet — confirmed against the live
// deployment, not inferred from source).
const WEBSITE_URL = 'https://chamberlink.netlify.app';

interface Props {
  /** Small uppercase label above the heading, e.g. "Welcome back". */
  kicker: string;
  /** Heading with the last word(s) wrapped in an <em> for the serif accent — pass as JSX, e.g. <>Return to your<br /><em>export desk.</em></>. */
  heading: ReactNode;
  lede: string;
  benefits: string[];
  cardIcon: string;
  cardTitle: string;
  cardLede: string;
  /** The actual form — LoginForm or RegisterForm, untouched. */
  children: ReactNode;
  dividerLabel: string;
  secondaryLinkTo: string;
  secondaryLinkLabel: string;
}

/**
 * Two-column auth shell (intro copy + benefits on the left, form card on the
 * right) shared by LoginPage and RegisterPage. Visually ported from the
 * chamberlink_website login/register pages — which themselves trace back to
 * the chamberlink-2 (Manus AI) prototype's design — but reimplemented as
 * Tailwind utilities on this app's own shared/ui components rather than a
 * copied stylesheet, so it stays consistent with the rest of the codebase
 * (no first-ever custom CSS file, no second icon library).
 *
 * Manrope/Playfair Display are scoped to THIS component only via explicit
 * font-manrope/font-display classes — the rest of the app keeps font-sans
 * (Inter). Deliberately does not merge "NACCIMA" into the wordmark here, for
 * the same reason the sidebar doesn't: this app is one shared login for every
 * onboarded chamber's members, not NACCIMA's alone.
 */
export function AuthShell({
  kicker, heading, lede, benefits, cardIcon, cardTitle, cardLede, children,
  dividerLabel, secondaryLinkTo, secondaryLinkLabel,
}: Props) {
  return (
    <div className="min-h-screen font-manrope text-ink bg-[linear-gradient(135deg,#f7f9fc_35%,#eef6f4_100%)] px-5 sm:px-8 py-8">
      {/* Brand row */}
      <div className="flex items-center justify-between max-w-[1180px] mx-auto mb-10 sm:mb-16">
        <a href={WEBSITE_URL} className="flex items-center gap-2.5" aria-label="Chamberlink home">
          <span className="h-11 w-11 rounded-[10px] bg-white flex items-center justify-center flex-shrink-0 shadow-[0_7px_18px_rgba(0,71,171,0.12)]">
            <img src="/naccima-seal.png" alt="" className="h-9 w-9 object-contain" />
          </span>
          <span className="leading-tight">
            <span className="block text-[17px] font-extrabold text-primary tracking-tight">Chamberlink</span>
          </span>
        </a>
        <span className="hidden sm:inline text-[10px] font-extrabold uppercase tracking-[0.1em] text-ink-subtle">
          Solid Minerals Export Platform
        </span>
      </div>

      <main className="grid lg:grid-cols-[1fr_440px] gap-14 lg:gap-24 items-center max-w-[1060px] mx-auto">
        {/* Intro / benefits */}
        <section>
          <div className="flex items-center gap-2 text-primary text-[11px] font-extrabold uppercase tracking-[0.13em] mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-[#DA0001] shadow-[0_0_0_5px_rgba(218,0,1,0.12)]" aria-hidden="true" />
            {kicker}
          </div>
          <h1 className="font-display text-[38px] sm:text-5xl lg:text-6xl leading-[1.05] tracking-tight mb-5">
            {heading}
          </h1>
          <p className="max-w-md text-sm leading-[1.85] text-ink-subtle mb-8">{lede}</p>
          <div className="grid gap-3.5">
            {benefits.map((b) => (
              <div key={b} className="flex items-center gap-2.5 text-[13px] font-bold text-ink">
                <span
                  className="material-symbols-outlined flex-shrink-0 text-success"
                  style={{ fontSize: 18, fontVariationSettings: `'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 18` }}
                >
                  check_circle
                </span>
                {b}
              </div>
            ))}
          </div>
        </section>

        {/* Form card */}
        <section className="bg-white border border-border p-7 sm:p-8 shadow-[0_22px_60px_rgba(19,34,56,0.1)] rounded-2xl">
          <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5">
            <span className="material-symbols-outlined" style={{ fontSize: 21, fontVariationSettings: `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 21` }}>
              {cardIcon}
            </span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-ink mb-1.5">{cardTitle}</h2>
          <p className="text-xs leading-relaxed text-ink-subtle mb-6">{cardLede}</p>

          {children}

          <div className="flex items-center gap-2.5 my-6 text-[10px] text-ink-subtle">
            <span className="flex-1 h-px bg-border" aria-hidden="true" />
            {dividerLabel}
            <span className="flex-1 h-px bg-border" aria-hidden="true" />
          </div>

          <Link
            to={secondaryLinkTo}
            className="flex items-center justify-center w-full rounded-lg border border-primary/30 py-2.5 text-xs font-bold text-primary hover:bg-primary/5 transition-colors"
          >
            {secondaryLinkLabel}
          </Link>

          <p className="flex items-center justify-center gap-1.5 mt-5 text-[9px] text-ink-subtle">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 13, fontVariationSettings: `'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 13` }}
              aria-hidden="true"
            >
              lock
            </span>
            Secure account access powered by Chamberlink
          </p>
        </section>
      </main>
    </div>
  );
}

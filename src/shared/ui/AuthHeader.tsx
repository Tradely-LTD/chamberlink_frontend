interface Props {
  subtitle: string;
}

/** Shared masthead for every auth page (login, register, verify, reset, etc.) —
 * the NACCIMA seal plus a page-specific subtitle. Centralized so the logo only
 * needs to be swapped in one place if it's ever updated per-tenant. */
export function AuthHeader({ subtitle }: Props) {
  return (
    <div className="mb-8 flex flex-col items-center text-center">
      <img
        src="/naccima-seal.png"
        alt="NACCIMA — Nigerian Association of Chambers of Commerce, Industry, Mines & Agriculture"
        className="h-20 w-20 object-contain"
      />
      <p className="mt-2 text-sm text-ink-subtle">{subtitle}</p>
    </div>
  );
}

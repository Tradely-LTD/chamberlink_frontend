import type { ReactNode } from 'react';

/** Renders "Label *" with the asterisk de-emphasised but still announced. */
export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  const text = typeof children === 'string' ? children : null;
  const required = text?.trim().endsWith('*');
  return (
    <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
      {required ? <>{text!.trim().slice(0, -1).trim()} <span className="text-danger" aria-hidden="true">*</span><span className="sr-only">(required)</span></> : children}
    </label>
  );
}

export function FieldMessage({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (error) return <p id={id} role="alert" className="text-xs text-danger">{error}</p>;
  if (hint) return <p id={id} className="text-xs text-ink-subtle">{hint}</p>;
  return null;
}

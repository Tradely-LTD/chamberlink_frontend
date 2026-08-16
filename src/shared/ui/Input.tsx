import { forwardRef, useId } from 'react';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, id: idProp, className = '', ...props }, ref) => {
    const generatedId = useId();
    const inputId = idProp ?? generatedId;

    return (
      <div className="flex flex-col gap-1">
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-ink"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          {...props}
          className={`w-full rounded-lg border bg-surface px-4 py-2.5 text-sm text-ink placeholder-ink-subtle outline-none transition focus:ring-2 focus:ring-primary/40 ${
            error ? 'border-danger' : 'border-border'
          } ${className}`}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

import { forwardRef, useId } from 'react';

interface Props extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ label, error, id: idProp, className = '', rows = 3, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = idProp ?? generatedId;

    return (
      <div className="flex flex-col gap-1">
        <label htmlFor={textareaId} className="text-sm font-medium text-ink">
          {label}
        </label>
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          {...props}
          className={`w-full resize-none rounded-lg border bg-surface px-4 py-2.5 text-sm text-ink placeholder-ink-subtle outline-none transition focus:ring-2 focus:ring-primary/40 ${
            error ? 'border-danger' : 'border-border'
          } ${className}`}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

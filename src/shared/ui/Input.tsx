import { forwardRef, useId } from 'react';
import { FieldLabel, FieldMessage } from './Field';
import { controlClass } from './fieldStyles';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  /** Persistent helper text under the field (replaced by the error when there is one). */
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, error, hint, id: idProp, className = '', ...props }, ref) => {
    const generatedId = useId();
    const inputId = idProp ?? generatedId;
    const msgId = `${inputId}-msg`;

    return (
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={!!error || undefined}
          aria-describedby={error || hint ? msgId : undefined}
          {...props}
          className={`h-10 px-3 ${controlClass(error)} ${className}`}
        />
        <FieldMessage id={msgId} error={error} hint={hint} />
      </div>
    );
  }
);
Input.displayName = 'Input';

import { forwardRef, useId } from 'react';
import { FieldLabel, FieldMessage } from './Field';
import { controlClass } from './fieldStyles';

interface Props extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ label, error, hint, id: idProp, className = '', rows = 3, ...props }, ref) => {
    const generatedId = useId();
    const textareaId = idProp ?? generatedId;
    const msgId = `${textareaId}-msg`;

    return (
      <div className="flex flex-col gap-1.5">
        <FieldLabel htmlFor={textareaId}>{label}</FieldLabel>
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          aria-invalid={!!error || undefined}
          aria-describedby={error || hint ? msgId : undefined}
          {...props}
          className={`resize-y px-3 py-2.5 leading-relaxed ${controlClass(error)} ${className}`}
        />
        <FieldMessage id={msgId} error={error} hint={hint} />
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

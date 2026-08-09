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
          className="text-sm font-medium text-[#221a0f]"
        >
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          {...props}
          className={`w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-[#023293]/40 ${
            error ? 'border-red-500' : 'border-[#bec9bf]'
          } ${className}`}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

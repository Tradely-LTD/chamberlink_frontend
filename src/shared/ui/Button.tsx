import { Spinner } from './Spinner';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
}

const variants: Record<NonNullable<Props['variant']>, string> = {
  primary: 'bg-[#00502e] text-white hover:bg-[#006b3f]',
  secondary: 'bg-[#795900] text-white hover:bg-[#5c4300]',
  ghost: 'bg-transparent text-[#00502e] hover:bg-[#00502e]/10 border border-[#00502e]',
  outline: 'bg-white text-[#221a0f] border border-[#bec9bf] hover:border-[#00502e] hover:text-[#00502e]',
};

export function Button({
  children,
  loading,
  variant = 'primary',
  disabled,
  className = '',
  ...props
}: Props) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}

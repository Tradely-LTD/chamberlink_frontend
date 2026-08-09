import { Spinner } from './Spinner';

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
}

const variants: Record<NonNullable<Props['variant']>, string> = {
  primary: 'bg-[#023293] text-white hover:bg-[#0267bf]',
  secondary: 'bg-[#795900] text-white hover:bg-[#5c4300]',
  ghost: 'bg-transparent text-[#023293] hover:bg-[#023293]/10 border border-[#023293]',
  outline: 'bg-white text-[#221a0f] border border-[#bec9bf] hover:border-[#023293] hover:text-[#023293]',
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

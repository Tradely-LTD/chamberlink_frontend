interface Props {
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' };

export function Spinner({ size = 'md' }: Props) {
  return (
    <span
      className={`inline-block ${sizes[size]} animate-spin rounded-full border-2 border-current border-t-transparent`}
      aria-label="Loading"
    />
  );
}

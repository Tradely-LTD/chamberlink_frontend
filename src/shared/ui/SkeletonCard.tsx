interface Props {
  className?: string;
}

export function SkeletonCard({ className = '' }: Props) {
  return <div aria-hidden="true" className={`animate-pulse rounded-card bg-border-subtle min-h-[80px] ${className}`} />;
}

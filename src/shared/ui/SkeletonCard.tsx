interface Props {
  className?: string;
}

export function SkeletonCard({ className = '' }: Props) {
  return <div className={`animate-pulse rounded-xl bg-gray-200 ${className}`} />;
}

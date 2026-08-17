import { forwardRef } from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

const paddings: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padding = 'md', interactive = false, className = '', children, ...props }, ref) => (
    <div
      ref={ref}
      {...props}
      className={`bg-surface rounded-xl border border-border shadow-card ${paddings[padding]} ${
        interactive ? 'transition-all hover:shadow-card-hover hover:border-primary/30' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
);
Card.displayName = 'Card';

export function CardHeader({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex items-center justify-between mb-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`text-sm font-semibold text-ink ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className = '', children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-xs text-ink-subtle mt-0.5 ${className}`} {...props}>
      {children}
    </p>
  );
}

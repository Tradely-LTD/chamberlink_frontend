import { forwardRef } from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

const paddings: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-7',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ padding = 'md', interactive = false, className = '', children, ...props }, ref) => (
    <div
      ref={ref}
      {...props}
      className={`bg-surface rounded-card border border-border ${paddings[padding]} ${
        interactive ? 'transition-[border-color,box-shadow] duration-200 hover:border-border-strong hover:shadow-card-hover' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
);
Card.displayName = 'Card';

export function CardHeader({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex items-start justify-between gap-3 mb-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`text-[15px] font-semibold text-ink ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className = '', children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-[13px] text-ink-subtle mt-0.5 ${className}`} {...props}>
      {children}
    </p>
  );
}

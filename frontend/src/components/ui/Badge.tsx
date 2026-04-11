import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-accent-primary/10 text-accent-primary border border-accent-primary/20',
  success: 'bg-status-success/10 text-status-success border border-status-success/20',
  warning: 'bg-status-warning/10 text-status-warning border border-status-warning/20',
  danger: 'bg-status-danger/10 text-status-danger border border-status-danger/20',
  info: 'bg-status-info/10 text-status-info border border-status-info/20',
  muted: 'bg-text-tertiary/10 text-text-tertiary border border-text-tertiary/20',
};

const sizeClasses: Record<'sm' | 'md', string> = {
  sm: 'px-2 py-0.5 text-xs rounded-md',
  md: 'px-3 py-1 text-sm rounded-lg',
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { variant = 'default', size = 'md', className = '', children, ...props },
    ref
  ) => {
    const variantClass = variantClasses[variant];
    const sizeClass = sizeClasses[size];
    const baseClasses = 'inline-flex items-center font-medium whitespace-nowrap';

    return (
      <span
        ref={ref}
        className={`${baseClasses} ${variantClass} ${sizeClass} ${className}`.trim()}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

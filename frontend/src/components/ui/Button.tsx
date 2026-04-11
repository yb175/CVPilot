import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: `
    bg-accent-primary hover:bg-indigo-700
    text-white font-semibold
    border border-accent-bright/40 hover:border-accent-bright/60
    shadow-glow-sm hover:shadow-glow-md
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-all duration-base
  `,
  secondary: `
    bg-surface-hover hover:bg-surface-active
    text-text-primary hover:text-text-inverse
    border border-border-normal hover:border-border-hover
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-all duration-base
  `,
  ghost: `
    bg-transparent hover:bg-surface-hover
    text-text-secondary hover:text-text-primary
    border border-transparent hover:border-border-light
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-all duration-base
  `,
  danger: `
    bg-status-danger hover:bg-red-600
    text-white font-semibold
    border border-status-danger/40 hover:border-status-danger/60
    shadow-sm hover:shadow-md
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-all duration-base
  `,
  success: `
    bg-status-success hover:bg-emerald-500
    text-white font-semibold
    border border-status-success/40 hover:border-status-success/60
    shadow-sm hover:shadow-md
    disabled:opacity-50 disabled:cursor-not-allowed
    transition-all duration-base
  `,
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs font-medium rounded-md gap-1.5',
  md: 'px-4 py-2 text-sm font-medium rounded-lg gap-2',
  lg: 'px-6 py-3 text-base font-semibold rounded-xl gap-2.5',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      isLoading = false,
      icon,
      iconPosition = 'right',
      className = '',
      disabled = false,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium active:scale-95 whitespace-nowrap';
    const variantClass = variantClasses[variant];
    const sizeClass = sizeClasses[size];
    const widthClass = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${variantClass} ${sizeClass} ${widthClass} ${className}`.trim()}
        {...props}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {children}
          </>
        ) : (
          <>
            {icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
            {children}
            {icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

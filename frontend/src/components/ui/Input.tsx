import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, helperText, fullWidth = false, className = '', ...props },
    ref
  ) => {
    const widthClass = fullWidth ? 'w-full' : '';
    const borderClass = error
      ? 'border-status-danger focus:border-status-danger focus:ring-status-danger/20'
      : 'border-border-normal focus:border-accent-primary focus:ring-accent-primary/20';

    return (
      <div className={widthClass}>
        {label && (
          <label className="block text-sm font-medium text-text-primary mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-3 py-2 rounded-lg
            bg-bg-surface border ${borderClass}
            text-text-primary placeholder-text-tertiary
            transition-all duration-base
            focus:outline-none focus:ring-2
            disabled:opacity-50 disabled:cursor-not-allowed
            ${className}
          `.trim()}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-xs text-status-danger font-medium">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-xs text-text-tertiary">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

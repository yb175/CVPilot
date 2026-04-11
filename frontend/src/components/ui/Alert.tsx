import React, { useEffect } from 'react';

type AlertVariant = 'success' | 'error' | 'warning' | 'info';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  autoDismiss?: number;
}

const variantClasses: Record<AlertVariant, { bg: string; border: string; text: string; icon: string }> = {
  success: {
    bg: 'bg-status-success/10',
    border: 'border-status-success/30',
    text: 'text-status-success',
    icon: 'text-status-success',
  },
  error: {
    bg: 'bg-status-danger/10',
    border: 'border-status-danger/30',
    text: 'text-status-danger',
    icon: 'text-status-danger',
  },
  warning: {
    bg: 'bg-status-warning/10',
    border: 'border-status-warning/30',
    text: 'text-status-warning',
    icon: 'text-status-warning',
  },
  info: {
    bg: 'bg-status-info/10',
    border: 'border-status-info/30',
    text: 'text-status-info',
    icon: 'text-status-info',
  },
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      variant = 'info',
      title,
      dismissible = false,
      onDismiss,
      autoDismiss = 4000,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const [isDismissed, setIsDismissed] = React.useState(false);

    useEffect(() => {
      if (isDismissed) return; // Don't set timer if already dismissed

      const timer = setTimeout(() => {
        setIsDismissed(true);
        onDismiss?.();
      }, autoDismiss);
      return () => clearTimeout(timer);
    }, [autoDismiss, onDismiss, isDismissed]);

    if (isDismissed) return null;

    const variantClass = variantClasses[variant];

    return (
      <div
        ref={ref}
        className={`${variantClass.bg} border ${variantClass.border} rounded-lg p-4 flex gap-3 ${className}`.trim()}
        {...props}
      >
        <div className="flex-shrink-0 mt-0.5">
          {variant === 'success' && (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          )}
          {variant === 'error' && (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          {variant === 'warning' && (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
          {variant === 'info' && (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          )}
        </div>

        <div className="flex-grow">
          {title && <h4 className="font-semibold mb-1">{title}</h4>}
          <div className={`text-sm ${variantClass.text}`}>{children}</div>
        </div>

        {dismissible && (
          <button
            onClick={() => {
              setIsDismissed(true);
              onDismiss?.();
            }}
            className="flex-shrink-0 text-gray-400 hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

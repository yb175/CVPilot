import React, { useEffect } from 'react';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  id: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
  onDismiss?: (id: string) => void;
}

const variantClasses: Record<ToastVariant, { bg: string; border: string; text: string; icon: { bg: string; text: string } }> = {
  success: {
    bg: 'bg-bg-surface border-status-success/30',
    border: 'border',
    text: 'text-text-primary',
    icon: {
      bg: 'bg-status-success/10',
      text: 'text-status-success',
    },
  },
  error: {
    bg: 'bg-bg-surface border-status-danger/30',
    border: 'border',
    text: 'text-text-primary',
    icon: {
      bg: 'bg-status-danger/10',
      text: 'text-status-danger',
    },
  },
  info: {
    bg: 'bg-bg-surface border-status-info/30',
    border: 'border',
    text: 'text-text-primary',
    icon: {
      bg: 'bg-status-info/10',
      text: 'text-status-info',
    },
  },
  warning: {
    bg: 'bg-bg-surface border-status-warning/30',
    border: 'border',
    text: 'text-text-primary',
    icon: {
      bg: 'bg-status-warning/10',
      text: 'text-status-warning',
    },
  },
};

const iconMap: Record<ToastVariant, React.ReactElement> = {
  success: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
};

export const Toast: React.FC<ToastProps> = ({
  id,
  message,
  variant = 'info',
  duration = 4000,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss?.(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  const classes = variantClasses[variant];

  return (
    <div
      className={`${classes.bg} ${classes.border} px-4 py-4 rounded-lg shadow-lg flex items-start gap-4 min-w-[340px] animate-slide-down backdrop-blur-sm`}
      role="alert"
    >
      {/* Icon */}
      <div className={`flex-shrink-0 p-2 rounded-lg ${classes.icon.bg}`}>
        <div className={classes.icon.text}>
          {iconMap[variant]}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${classes.text}`}>{message}</p>
      </div>

      {/* Close Button */}
      <button
        onClick={() => onDismiss?.(id)}
        className="flex-shrink-0 text-text-tertiary hover:text-text-secondary transition-colors p-1"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
  );
};


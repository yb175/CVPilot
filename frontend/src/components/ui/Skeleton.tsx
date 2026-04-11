import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular';
  count?: number;
}

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      width = '100%',
      height = '1rem',
      variant = 'rectangular',
      count = 1,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseClass = 'bg-bg-surface animate-pulse';

    const variantClasses: Record<string, string> = {
      text: 'rounded-md',
      circular: 'rounded-full',
      rectangular: 'rounded-lg',
    };

    const skeletons = Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        ref={i === 0 ? ref : undefined}
        style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
        }}
        className={`${baseClass} ${variantClasses[variant]} ${className}`.trim()}
        {...props}
      />
    ));

    return count === 1 ? skeletons[0] : <div className="space-y-2">{skeletons}</div>;
  }
);

Skeleton.displayName = 'Skeleton';

import React from 'react';

interface GridBackgroundProps {
  variant?: 'default' | 'light';
}

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  fluid?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  noPadding?: boolean;
}

export interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  background?: 'primary' | 'secondary' | 'tertiary';
}

export const GridBackground: React.FC<GridBackgroundProps> = ({ variant = 'default' }) => {
  const opacity = variant === 'light' ? 'rgba(99,102,241,0.02)' : 'rgba(99,102,241,0.04)';

  return (
    <div
      className="fixed inset-0 pointer-events-none -z-10"
      style={{
        backgroundImage: `linear-gradient(${opacity} 1px, transparent 1px), linear-gradient(90deg, ${opacity} 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }}
    />
  );
};

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  (
    { fluid = false, size = 'lg', noPadding = false, className = '', children, ...props },
    ref
  ) => {
    const sizeClasses: Record<string, string> = {
      sm: 'max-w-container-sm',
      md: 'max-w-container-md',
      lg: 'max-w-content',
      xl: 'max-w-container-xl',
    };

    const paddingClass = noPadding ? '' : 'px-4 sm:px-6';
    const sizeClass = fluid ? 'w-full' : sizeClasses[size];

    return (
      <div
        ref={ref}
        className={`mx-auto ${sizeClass} ${paddingClass} ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Container.displayName = 'Container';

export const PageContainer = React.forwardRef<HTMLDivElement, PageContainerProps>(
  (
    { background = 'secondary', className = '', children, ...props },
    ref
  ) => {
    const bgClasses: Record<string, string> = {
      primary: 'bg-bg-primary',
      secondary: 'bg-bg-secondary',
      tertiary: 'bg-bg-tertiary',
    };

    return (
      <div
        ref={ref}
        className={`min-h-screen text-text-primary ${bgClasses[background]} ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    );
  }
);

PageContainer.displayName = 'PageContainer';

export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  tagline?: string;
  title: React.ReactNode;
  description?: string;
}

export const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  (
    { tagline, title, description, className = '', ...props },
    ref
  ) => {
    return (
      <div ref={ref} className={`mb-8 sm:mb-10 ${className}`.trim()} {...props}>
        {tagline && (
          <p className="text-xs tracking-widest text-text-tertiary font-semibold mb-4 uppercase">
            {tagline}
          </p>
        )}
        <h1
          className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight text-text-primary mb-3 font-display"
        >
          {title}
        </h1>
        {description && (
          <p className="text-text-secondary text-sm sm:text-base leading-relaxed max-w-lg">
            {description}
          </p>
        )}
      </div>
    );
  }
);

PageHeader.displayName = 'PageHeader';

import React from 'react';

type CardVariant = 'default' | 'elevated' | 'bordered';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  interactive?: boolean;
}

interface CardSubComponent {
  Header: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  Body: React.FC<React.HTMLAttributes<HTMLDivElement>>;
  Footer: React.FC<React.HTMLAttributes<HTMLDivElement>>;
}

const variantClasses: Record<CardVariant, string> = {
  default: 'bg-bg-surface border border-border-light hover:border-border-normal',
  elevated: 'bg-bg-surface border border-border-light shadow-md hover:shadow-lg',
  bordered: 'bg-transparent border border-border-normal hover:border-border-hover',
};

const CardComponent = React.forwardRef<HTMLDivElement, CardProps>(
  (
    { variant = 'default', interactive = false, className = '', children, ...props },
    ref
  ) => {
    const variantClass = variantClasses[variant];
    const interactiveClass = interactive ? 'hover:bg-bg-hover cursor-pointer transition-all duration-base' : '';
    const baseClasses = 'rounded-xl overflow-hidden backdrop-blur-sm';

    return (
      <div
        ref={ref}
        className={`${baseClasses} ${variantClass} ${interactiveClass} ${className}`.trim()}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardComponent.displayName = 'Card';

const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => (
  <div className={`px-5 sm:px-6 py-4 border-b border-border-light ${className}`.trim()} {...props}>
    {children}
  </div>
);

CardHeader.displayName = 'CardHeader';

const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => (
  <div className={`px-5 sm:px-6 py-5 ${className}`.trim()} {...props}>
    {children}
  </div>
);

CardBody.displayName = 'CardBody';

const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => (
  <div className={`px-5 sm:px-6 py-4 border-t border-border-light bg-bg-hover/50 ${className}`.trim()} {...props}>
    {children}
  </div>
);

CardFooter.displayName = 'CardFooter';

export const Card: React.FC<CardProps> & CardSubComponent = Object.assign(CardComponent, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
});

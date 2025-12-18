import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success';
}

const Badge: React.FC<BadgeProps> = ({
  children,
  className = '',
  variant = 'default',
}) => {
  const variantClasses = {
    default: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
    outline: 'border border-input bg-background text-foreground',
    warning: 'bg-orange-100 text-orange-800 border border-orange-200',
    success: 'bg-green-100 text-green-800 border border-green-200',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;

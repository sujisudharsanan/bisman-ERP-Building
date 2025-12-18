'use client';
import React from 'react';

// Support both shadcn-style and MUI-style variants for backward compatibility
type ButtonVariant = 'default' | 'destructive' | 'outline' | 'outlined' | 'secondary' | 'ghost' | 'link' | 'contained' | 'text';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon' | 'small' | 'medium' | 'large';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
  outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
  outlined: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground', // MUI alias
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
  link: 'text-primary underline-offset-4 hover:underline',
  contained: 'bg-primary text-primary-foreground hover:bg-primary/90', // MUI alias
  text: 'text-primary hover:bg-accent hover:text-accent-foreground', // MUI alias
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-10 px-4 py-2',
  sm: 'h-9 rounded-md px-3',
  lg: 'h-11 rounded-md px-8',
  icon: 'h-10 w-10',
  small: 'h-9 rounded-md px-3', // MUI alias
  medium: 'h-10 px-4 py-2', // MUI alias
  large: 'h-11 rounded-md px-8', // MUI alias
};

export default function Button({
  children,
  variant = 'default',
  size = 'default',
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}

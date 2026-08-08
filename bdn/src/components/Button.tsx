import React, { ButtonHTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      icon,
      iconPosition = 'left',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/50 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:pointer-events-none disabled:opacity-50 select-none rounded-md cursor-pointer';

    const sizeStyles: Record<ButtonSize, string> = {
      sm: 'text-xs px-3 py-1.5 h-8 gap-1.5',
      md: 'text-sm px-4 py-2 h-10 gap-2',
      lg: 'text-base px-6 py-2.5 h-12 gap-2.5',
    };

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        'bg-[#E50914] hover:bg-[#b9090b] hover:brightness-110 active:brightness-95 text-white shadow-md shadow-red-950/40 border border-red-600/30',
      secondary:
        'bg-neutral-800 hover:bg-neutral-700 hover:text-white text-neutral-200 border border-neutral-700/80 active:bg-neutral-850',
      outline:
        'bg-transparent hover:bg-white/10 text-neutral-200 border border-neutral-600 hover:border-neutral-300 active:bg-white/20',
      ghost:
        'bg-transparent hover:bg-neutral-800/80 text-neutral-300 hover:text-white active:bg-neutral-800',
      danger:
        'bg-rose-700 hover:bg-rose-800 text-white shadow-sm border border-rose-600/30 active:bg-rose-900',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!isLoading && icon && iconPosition === 'left' && <span className="inline-flex shrink-0">{icon}</span>}
        <span>{children}</span>
        {!isLoading && icon && iconPosition === 'right' && <span className="inline-flex shrink-0">{icon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

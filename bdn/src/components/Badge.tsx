import React, { HTMLAttributes } from 'react';
import { cn } from '../utils/cn';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'outline' | 'gold';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'neutral',
  size = 'md',
  icon,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center font-semibold rounded tracking-wide uppercase transition-colors shrink-0';

  const sizeStyles: Record<BadgeSize, string> = {
    sm: 'px-2 py-0.5 text-[10px] gap-1',
    md: 'px-2.5 py-1 text-xs gap-1.5',
  };

  const variantStyles: Record<BadgeVariant, string> = {
    primary: 'bg-red-950/80 text-red-400 border border-red-800/80',
    success: 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80',
    warning: 'bg-amber-950/80 text-amber-300 border border-amber-800/80',
    error: 'bg-rose-950/80 text-rose-300 border border-rose-800/80',
    neutral: 'bg-neutral-800 text-neutral-300 border border-neutral-700',
    outline: 'bg-transparent text-neutral-300 border border-neutral-600',
    gold: 'bg-amber-950/80 text-amber-400 border border-amber-700/80',
  };

  return (
    <span className={cn(baseStyles, sizeStyles[size], variantStyles[variant], className)} {...props}>
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};

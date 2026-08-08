import React from 'react';
import { cn } from '../utils/cn';

export interface LoadingStateProps {
  message?: string;
  subtitle?: string;
  className?: string;
  type?: 'spinner' | 'skeleton';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading cinema data...',
  subtitle = 'Fetching latest showtimes and availability',
  className,
  type = 'spinner',
}) => {
  if (type === 'skeleton') {
    return (
      <div className={cn('w-full space-y-4 p-6 bg-neutral-900 border border-neutral-800 rounded-xl animate-pulse shadow-lg', className)}>
        <div className="h-6 bg-neutral-800 rounded w-1/3"></div>
        <div className="h-4 bg-neutral-850 rounded w-2/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="h-32 bg-neutral-800 rounded-lg"></div>
          <div className="h-32 bg-neutral-800 rounded-lg"></div>
          <div className="h-32 bg-neutral-800 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4 text-center space-y-4', className)}>
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-neutral-800 border-t-red-600 animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 bg-red-600 rounded-full animate-ping"></div>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-neutral-200">{message}</p>
        {subtitle && <p className="text-xs text-neutral-400">{subtitle}</p>}
      </div>
    </div>
  );
};

import React from 'react';
import { Film } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../utils/cn';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title = 'No movies available',
  description = 'There are currently no listings matching your criteria. Try adjusting filters or search query.',
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 text-center bg-neutral-900 border border-neutral-800 rounded-xl space-y-4 my-6 shadow-xl',
        className
      )}
    >
      <div className="w-14 h-14 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 shrink-0">
        {icon || <Film className="w-7 h-7 text-neutral-400" />}
      </div>

      <div className="space-y-1.5 max-w-sm">
        <h4 className="text-base font-bold text-white">{title}</h4>
        <p className="text-xs text-neutral-400 leading-relaxed">{description}</p>
      </div>

      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

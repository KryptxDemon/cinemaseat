import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../utils/cn';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  code?: string | number;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'System Error Encountered',
  message = 'Unable to fetch movie data from the backend server.',
  code,
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center bg-rose-950/30 border border-rose-900/60 rounded-xl max-w-lg mx-auto space-y-4 my-6 shadow-xl',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-rose-900/50 border border-rose-700/60 flex items-center justify-center text-rose-400 shrink-0">
        <AlertTriangle className="w-6 h-6" />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-center gap-2">
          <h4 className="text-base font-semibold text-white">{title}</h4>
          {code && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-900/80 text-rose-300 border border-rose-700">
              HTTP {code}
            </span>
          )}
        </div>
        <p className="text-xs text-neutral-300 max-w-md">{message}</p>
      </div>

      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          icon={<RefreshCw className="w-3.5 h-3.5" />}
          onClick={onRetry}
          className="mt-2 text-neutral-200 border-neutral-700 hover:bg-neutral-800"
        >
          Try Again
        </Button>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface HoldTimerProps {
  expiresAt: string; // ISO 8601 string from backend
  onExpire: () => void;
  className?: string;
  compact?: boolean;
}

export const HoldTimer: React.FC<HoldTimerProps> = ({
  expiresAt,
  onExpire,
  className = '',
  compact = false,
}) => {
  const calculateRemainingSeconds = (): number => {
    if (!expiresAt) return 0;
    const expireTime = new Date(expiresAt).getTime();
    const now = Date.now();
    return Math.max(0, Math.floor((expireTime - now) / 1000));
  };

  const [secondsLeft, setSecondsLeft] = useState<number>(calculateRemainingSeconds);

  useEffect(() => {
    const initialRemaining = calculateRemainingSeconds();
    setSecondsLeft(initialRemaining);

    if (initialRemaining <= 0) {
      onExpire();
      return;
    }

    const interval = setInterval(() => {
      const remaining = calculateRemainingSeconds();
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  // Format seconds to MM:SS
  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isLowTime = secondsLeft <= 120 && secondsLeft > 0; // <= 2 minutes
  const isCriticalTime = secondsLeft <= 60 && secondsLeft > 0; // <= 1 minute

  if (compact) {
    return (
      <span
        className={`font-semibold text-xs inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
          isCriticalTime
            ? 'bg-red-950/90 text-red-300 border-red-800 animate-pulse'
            : isLowTime
            ? 'bg-amber-950/90 text-amber-300 border-amber-800'
            : 'bg-emerald-950/90 text-emerald-300 border-emerald-800'
        } ${className}`}
      >
        <Clock className={`w-3.5 h-3.5 shrink-0 ${isCriticalTime ? 'animate-pulse' : ''}`} />
        <span>Seat held · {formatTime(secondsLeft)} remaining</span>
      </span>
    );
  }

  return (
    <div
      className={`p-3.5 rounded-xl border transition-all duration-300 ${
        isCriticalTime
          ? 'bg-red-950/80 border-red-700 text-red-200 shadow-lg shadow-red-950/60'
          : isLowTime
          ? 'bg-amber-950/80 border-amber-700 text-amber-200 shadow-lg shadow-amber-950/60'
          : 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isCriticalTime || isLowTime ? (
            <AlertTriangle
              className={`w-4 h-4 shrink-0 ${
                isCriticalTime ? 'text-red-400 animate-bounce' : 'text-amber-400'
              }`}
            />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          )}
          <span className="text-xs font-bold">
            {isCriticalTime
              ? 'Hold Expiring Soon!'
              : isLowTime
              ? 'Hurry! Hold Time Ending'
              : 'Seat Held'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Clock
            className={`w-4 h-4 ${
              isCriticalTime
                ? 'text-red-400 animate-pulse'
                : isLowTime
                ? 'text-amber-400 animate-pulse'
                : 'text-emerald-400'
            }`}
          />
          <span
            className={`text-sm font-bold tracking-wider ${
              isCriticalTime
                ? 'text-red-400'
                : isLowTime
                ? 'text-amber-400'
                : 'text-emerald-300'
            }`}
          >
            {formatTime(secondsLeft)}
          </span>
        </div>
      </div>

      <p className="text-xs text-neutral-300 mt-1">
        {secondsLeft > 0
          ? `Seats locked for ${formatTime(secondsLeft)} while you complete payment`
          : 'Seat hold expired'}
      </p>
    </div>
  );
};

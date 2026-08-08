import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, Film, Ticket } from 'lucide-react';
import { Showtime } from '../types/showtime';
import { Card, CardContent } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { formatCurrency, formatTime } from '../utils/formatters';

interface ShowtimeCardProps {
  showtime: Showtime;
  showTheatreName?: boolean;
}

export const ShowtimeCard: React.FC<ShowtimeCardProps> = ({ showtime, showTheatreName = true }) => {
  const isLowAvailability = showtime.availableSeatsCount <= 10;

  return (
    <Card className="p-0 overflow-hidden bg-neutral-900/90 border-neutral-800 hover:border-neutral-700 transition-all duration-200">
      <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left Section: Where & When */}
        <div className="flex items-center gap-3.5 sm:gap-4">
          {/* Showtime Box */}
          <div className="w-20 sm:w-24 py-2.5 px-1.5 rounded-lg bg-red-950/40 border border-red-800/60 flex flex-col items-center justify-center shrink-0 shadow-sm">
            <span className="text-base sm:text-lg font-bold text-red-400 leading-none">
              {formatTime(showtime.startTime)}
            </span>
            <span className="text-[10px] text-red-400 uppercase tracking-wider font-semibold mt-1">
              {showtime.format}
            </span>
          </div>

          {/* Details Column */}
          <div className="space-y-1">
            {showTheatreName && (
              <h4 className="text-sm font-bold text-white tracking-tight leading-snug">
                {showtime.hallName}
              </h4>
            )}

            <div className="flex items-center gap-2 flex-wrap text-xs text-neutral-300">
              <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-200 border border-neutral-700/80 font-medium">
                {showtime.format}
              </span>
              <span className="text-neutral-600">•</span>
              <span className={isLowAvailability ? 'text-amber-400 font-bold' : 'text-neutral-300 font-medium'}>
                {showtime.availableSeatsCount} seats available
              </span>
            </div>
          </div>
        </div>

        {/* Right Section: How Much & Action */}
        <div className="flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-neutral-800/80">
          <div className="text-left sm:text-right">
            <span className="text-[11px] text-neutral-400 uppercase font-semibold block">Ticket</span>
            <span className="text-base font-bold text-white leading-none">
              {formatCurrency(showtime.priceUSD)}
            </span>
          </div>

          <Link to={`/shows/${showtime.id}/seats`}>
            <Button
              variant="primary"
              size="sm"
              className="px-4 py-2 text-xs font-bold shadow-md shadow-red-950/40 min-w-[80px]"
              icon={<Ticket className="w-3.5 h-3.5" />}
            >
              Select
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

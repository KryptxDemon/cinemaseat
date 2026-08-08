import React from 'react';
import { Seat as SeatType, ShowDetails, HoldResponse } from '../types/seat';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { HoldTimer } from './HoldTimer';
import { Ticket, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { formatCurrency, formatTime } from '../utils/formatters';

interface BookingSummaryProps {
  show: ShowDetails;
  selectedSeats: SeatType[];
  heldSeats: SeatType[];
  holdData: HoldResponse | null;
  isHolding: boolean;
  onHoldSeats: () => void;
  onProceedToPayment: () => void;
  onHoldExpired: () => void;
  error: string | null;
}

export const BookingSummary: React.FC<BookingSummaryProps> = ({
  show,
  selectedSeats,
  heldSeats,
  holdData,
  isHolding,
  onHoldSeats,
  onProceedToPayment,
  onHoldExpired,
  error,
}) => {
  const isHeld = holdData !== null && holdData.status === 'active';
  const displaySeats = isHeld ? heldSeats : selectedSeats;
  const hasSeats = displaySeats.length > 0;

  const totalPrice = displaySeats.reduce((sum, s) => sum + s.priceUSD, 0);

  return (
    <Card className="bg-neutral-900 border-neutral-800 shadow-2xl sticky top-20">
      <CardHeader className="pb-4 border-b border-neutral-800">
        <div className="flex items-center justify-between gap-2">
          <Badge variant={isHeld ? 'success' : 'primary'} size="sm">
            {isHeld ? 'Hold Confirmed' : 'Selection Stage'}
          </Badge>
          <span className="text-xs font-mono text-neutral-400">{show.format}</span>
        </div>
        <CardTitle className="text-lg font-bold text-white pt-1">{show.movieTitle}</CardTitle>
        <p className="text-xs text-neutral-400 font-mono">
          {show.hallName} • {formatTime(show.startTime)} • {show.date}
        </p>
      </CardHeader>

      <CardContent className="py-5 space-y-4">
        {/* Selected Seats List */}
        <div>
          <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider block mb-2">
            Selected Seats ({displaySeats.length})
          </span>

          {!hasSeats ? (
            <div className="p-4 rounded-xl bg-neutral-950/60 border border-dashed border-neutral-800 text-center space-y-1">
              <Ticket className="w-5 h-5 text-neutral-600 mx-auto" />
              <p className="text-xs text-neutral-400 font-medium">No seats selected yet</p>
              <p className="text-[10px] text-neutral-500 font-mono">
                Click any available seat on the map
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto pr-1">
              {displaySeats.map((seat) => (
                <div
                  key={seat.id}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-2 ${
                    isHeld
                      ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                      : 'bg-red-950/40 border-red-800/80 text-red-300'
                  }`}
                >
                  <span className="font-bold">{seat.row}{seat.number}</span>
                  <span className="text-[10px] text-neutral-400 uppercase">({seat.tier})</span>
                  <span className="text-white font-bold ml-1">{formatCurrency(seat.priceUSD)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reusable HoldTimer Component */}
        {isHeld && holdData && (
          <HoldTimer
            expiresAt={holdData.expiresAt}
            onExpire={onHoldExpired}
          />
        )}

        {/* Error Alert Box */}
        {error && (
          <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs font-mono flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-white block">Notice</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Price Total */}
        <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
          <div>
            <span className="text-xs text-neutral-400 font-mono uppercase block">Total Amount</span>
            <span className="text-xs text-neutral-500 font-mono">Includes all taxes & fees</span>
          </div>
          <span className="text-2xl font-black text-white font-mono">{formatCurrency(totalPrice)}</span>
        </div>
      </CardContent>

      <CardFooter className="pt-2 border-t border-neutral-800">
        {!isHeld ? (
          <Button
            variant="primary"
            className="w-full py-3 text-sm font-bold shadow-lg shadow-red-950/50"
            disabled={!hasSeats || isHolding}
            isLoading={isHolding}
            onClick={onHoldSeats}
            icon={<ShieldCheck className="w-4 h-4" />}
          >
            {isHolding ? 'Requesting Hold...' : `Hold ${displaySeats.length > 0 ? displaySeats.length : ''} Seat${displaySeats.length > 1 ? 's' : ''}`}
          </Button>
        ) : (
          <Button
            variant="primary"
            className="w-full py-3 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50"
            onClick={onProceedToPayment}
            icon={<ArrowRight className="w-4 h-4" />}
          >
            Proceed to Payment
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

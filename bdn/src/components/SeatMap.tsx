import React from 'react';
import { SeatMapData, Seat as SeatType } from '../types/seat';
import { Seat } from './Seat';
import { Lock, ShieldAlert, Sparkles, Check } from 'lucide-react';

interface SeatMapProps {
  seatMap: SeatMapData;
  selectedSeatIds: string[];
  heldSeatIds: string[];
  onToggleSeat: (seat: SeatType) => void;
  disabled?: boolean;
}

export const SeatMap: React.FC<SeatMapProps> = ({
  seatMap,
  selectedSeatIds,
  heldSeatIds,
  onToggleSeat,
  disabled = false,
}) => {
  const { rows, seatsPerRow, aisleAfterNumber, seats } = seatMap;

  // Helper to index seats by row
  const seatsByRow = React.useMemo(() => {
    const map: Record<string, SeatType[]> = {};
    rows.forEach((row) => {
      map[row] = seats
        .filter((s) => s.row === row)
        .sort((a, b) => a.number - b.number);
    });
    return map;
  }, [rows, seats]);

  return (
    <div className="w-full space-y-8 bg-neutral-950/90 border border-neutral-800 rounded-2xl p-4 sm:p-8 shadow-2xl">
      {/* Curved Cinema Screen Header */}
      <div className="max-w-xl mx-auto space-y-3 text-center">
        <div className="relative pt-2">
          {/* Curved glowing screen line */}
          <div className="h-2.5 w-full bg-gradient-to-r from-red-600/20 via-red-500 to-red-600/20 rounded-t-[100%] border-t-2 border-red-500 shadow-[0_-8px_24px_rgba(229,9,20,0.4)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-red-500/10 to-transparent pointer-events-none blur-sm h-12" />
        </div>
        <span className="text-[11px] uppercase tracking-[0.2em] font-mono font-black text-neutral-400 block pt-1">
          CINEMA SCREEN
        </span>
      </div>

      {/* Seat Grid Layout Container with Mobile Horizontal Scroll */}
      <div className="overflow-x-auto pb-6 pt-2 scrollbar-thin scrollbar-thumb-neutral-800">
        <div className="min-w-[560px] max-w-2xl mx-auto space-y-3 sm:space-y-4 px-2">
          {rows.map((rowLetter) => {
            const rowSeats = seatsByRow[rowLetter] || [];
            const tier = rowSeats[0]?.tier || 'standard';

            return (
              <div key={rowLetter} className="flex items-center justify-between gap-2 sm:gap-3">
                {/* Left Row Label */}
                <div className="w-6 sm:w-8 flex flex-col items-center justify-center shrink-0">
                  <span className="text-xs sm:text-sm font-mono font-bold text-neutral-400">
                    {rowLetter}
                  </span>
                  <span className="text-[8px] font-mono text-neutral-600 uppercase">
                    {tier === 'vip' ? 'VIP' : tier === 'premium' ? 'PREM' : 'STD'}
                  </span>
                </div>

                {/* Seats Row with Aisles */}
                <div className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2">
                  {rowSeats.map((seat) => {
                    const isAisleAfter = aisleAfterNumber.includes(seat.number);
                    const isSelected = selectedSeatIds.includes(seat.id);
                    const isHeldByUser = heldSeatIds.includes(seat.id);

                    return (
                      <React.Fragment key={seat.id}>
                        <Seat
                          seat={seat}
                          isCurrentlySelected={isSelected}
                          isCurrentlyHeldByUser={isHeldByUser}
                          onSelect={onToggleSeat}
                          disabled={disabled}
                        />

                        {/* Realistic Aisle Gap */}
                        {isAisleAfter && seat.number !== seatsPerRow && (
                          <div className="w-4 sm:w-8 shrink-0 flex items-center justify-center">
                            <span className="w-0.5 h-6 bg-neutral-800/40 rounded-full" />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Right Row Label */}
                <div className="w-6 sm:w-8 flex flex-col items-center justify-center shrink-0">
                  <span className="text-xs sm:text-sm font-mono font-bold text-neutral-400">
                    {rowLetter}
                  </span>
                  <span className="text-[8px] font-mono text-neutral-600 uppercase">
                    {tier === 'vip' ? 'VIP' : tier === 'premium' ? 'PREM' : 'STD'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Visually Obvious Legend */}
      <div className="pt-6 border-t border-neutral-800/80">
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs font-mono text-neutral-300">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-neutral-900 border border-neutral-700" />
            <span>Available</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-[#E50914] border border-red-400 shadow-sm shadow-red-900/50" />
            <span className="font-bold text-white">Selected</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-amber-950/80 border border-amber-600 flex items-center justify-center text-amber-400">
              <Lock className="w-2.5 h-2.5" />
            </span>
            <span className="text-amber-400 font-medium">Held (Locked)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-neutral-900/90 border border-neutral-800 flex items-center justify-center text-neutral-600 opacity-60">
              <ShieldAlert className="w-2.5 h-2.5" />
            </span>
            <span className="text-neutral-500">Booked</span>
          </div>

          <div className="flex items-center gap-2 border-l border-neutral-800 pl-4">
            <span className="w-3 h-3 rounded-full bg-indigo-500" />
            <span className="text-indigo-300">Premium (+$2.50)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-400" />
            <span className="text-amber-300">VIP Recline (+$5.00)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

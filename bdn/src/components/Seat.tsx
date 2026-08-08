import { Lock, ShieldAlert } from 'lucide-react';
import React from 'react';
import { Seat as SeatType } from '../types/seat';
import { formatCurrency } from '../utils/formatters';

interface SeatProps {
  seat: SeatType;
  isCurrentlySelected: boolean;
  isCurrentlyHeldByUser?: boolean;
  onSelect: (seat: SeatType) => void;
  disabled?: boolean;
}

export const Seat: React.FC<SeatProps> = ({
  seat,
  isCurrentlySelected,
  isCurrentlyHeldByUser,
  onSelect,
  disabled = false,
}) => {
  // Determine displayed visual state
  const isBooked = seat.status === 'booked';
  const isHeldByOther = seat.status === 'held' && !isCurrentlyHeldByUser;
  const isHeldByUser = seat.status === 'held' && isCurrentlyHeldByUser;
  const isAvailable = seat.status === 'available';

  const isInteractive = isAvailable && !disabled;

  const handleClick = () => {
    if (isInteractive) {
      onSelect(seat);
    }
  };

  // Tier indicators
  const isPremium = seat.tier === 'premium';
  const isVip = seat.tier === 'vip';

  // Base layout styles for seat cushion shape
  let statusClasses = '';
  let icon = null;

  if (isCurrentlySelected) {
    statusClasses =
      'bg-red-600 border-red-400 text-white shadow-lg shadow-red-900/60 ring-2 ring-red-400 ring-offset-1 ring-offset-neutral-950 font-black scale-105 z-10';
  } else if (isHeldByUser) {
    statusClasses =
      'bg-emerald-950/90 border-emerald-600 text-emerald-300 font-bold shadow-md shadow-emerald-950/50';
  } else if (isHeldByOther) {
    statusClasses =
      'bg-amber-950/60 border-amber-800/80 text-amber-500/80 cursor-not-allowed opacity-75';
    icon = <Lock className="w-2.5 h-2.5 opacity-80 shrink-0" />;
  } else if (isBooked) {
    statusClasses =
      'bg-neutral-900/90 border-neutral-800 text-neutral-600 cursor-not-allowed opacity-40';
    icon = <ShieldAlert className="w-2.5 h-2.5 opacity-40 shrink-0" />;
  } else {
    // Available
    if (isVip) {
      statusClasses =
        'bg-amber-950/20 border-amber-700/60 text-amber-200 hover:bg-amber-600 hover:text-white hover:border-amber-400 shadow-sm';
    } else if (isPremium) {
      statusClasses =
        'bg-indigo-950/20 border-indigo-700/60 text-indigo-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-400 shadow-sm';
    } else {
      statusClasses =
        'bg-neutral-900 border-neutral-700/80 text-neutral-200 hover:bg-red-600 hover:text-white hover:border-red-500';
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!isInteractive && !isCurrentlySelected}
      aria-label={`Seat ${seat.row}${seat.number} - ${seat.tier} - ${formatCurrency(
        seat.priceUSD
      )} - Status: ${
        isCurrentlySelected ? 'Selected' : isHeldByUser ? 'Held by you' : seat.status
      }`}
      title={`${seat.row}${seat.number} (${seat.tier.toUpperCase()}) - ${formatCurrency(
        seat.priceUSD
      )} [${isCurrentlySelected ? 'Selected' : seat.status}]`}
      className={`
        relative w-8 h-8 sm:w-10 sm:h-10 rounded-t-lg rounded-b-md text-[10px] sm:text-xs font-mono
        flex flex-col items-center justify-center border transition-all duration-150
        select-none cursor-pointer group
        ${statusClasses}
      `}
    >
      {/* Seat Top Cushion Bar */}
      <div
        className={`absolute -top-1 w-[80%] h-1 rounded-t-sm transition-colors ${
          isCurrentlySelected
            ? 'bg-red-300'
            : isHeldByUser
            ? 'bg-emerald-400'
            : isHeldByOther
            ? 'bg-amber-700'
            : isBooked
            ? 'bg-neutral-800'
            : isVip
            ? 'bg-amber-600/60'
            : isPremium
            ? 'bg-indigo-600/60'
            : 'bg-neutral-600/60'
        }`}
      />

      {icon ? (
        icon
      ) : (
        <span className="font-bold tracking-tighter leading-none">{seat.number}</span>
      )}

      {/* Subtle indicator dot for VIP/Premium when available */}
      {isAvailable && !isCurrentlySelected && (isVip || isPremium) && (
        <span
          className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
            isVip ? 'bg-amber-400' : 'bg-indigo-400'
          }`}
        />
      )}
    </button>
  );
};

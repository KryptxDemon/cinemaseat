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

  const isInteractive = (isAvailable || isHeldByUser) && !disabled;

  const handleClick = () => {
    if (isInteractive) {
      onSelect(seat);
    }
  };

  let statusClasses = '';

  if (isCurrentlySelected) {
    statusClasses =
      'bg-[#E50914] border-red-400 text-white font-bold shadow-md shadow-red-950/60 scale-105 z-10';
  } else if (isHeldByUser) {
    statusClasses =
      'bg-amber-600 border-amber-400 text-white font-bold shadow-md shadow-amber-950/50 scale-105 z-10';
  } else if (isHeldByOther) {
    statusClasses =
      'bg-amber-950/40 border-amber-800/60 text-amber-500/70 cursor-not-allowed';
  } else if (isBooked) {
    statusClasses =
      'bg-neutral-900/60 border-neutral-800/80 text-neutral-600 cursor-not-allowed';
  } else {
    // Available seat - clean, simple, easy to read
    statusClasses =
      'bg-neutral-900 border-neutral-700/80 text-neutral-200 hover:bg-[#E50914] hover:text-white hover:border-red-500 transition-colors';
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!isInteractive}
      aria-label={`Seat ${seat.row}${seat.number} - ${formatCurrency(
        seat.priceUSD
      )} - Status: ${
        isCurrentlySelected ? 'Selected' : isHeldByUser ? 'Held by you' : seat.status
      }`}
      title={`Seat ${seat.row}${seat.number} - ${formatCurrency(
        seat.priceUSD
      )} [${isCurrentlySelected ? 'Selected' : seat.status}]`}
      className={`
        relative w-8 h-8 sm:w-10 sm:h-10 rounded-lg text-xs sm:text-sm font-semibold
        flex items-center justify-center border transition-all duration-150
        select-none cursor-pointer
        ${statusClasses}
      `}
    >
      <span>{seat.number}</span>
    </button>
  );
};

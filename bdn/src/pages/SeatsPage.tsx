import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Film, Clock, RefreshCw, ShieldCheck, Star } from 'lucide-react';
import { fetchSeatsByShowId, updateMockSeatStatuses } from '../api/seats';
import { createSeatHold } from '../api/holds';
import { SeatMapData, Seat as SeatType, HoldResponse } from '../types/seat';
import { useAsync } from '../hooks/useAsync';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { SeatMap } from '../components/SeatMap';
import { BookingSummary } from '../components/BookingSummary';
import { formatDuration } from '../utils/formatters';
import { useAuth } from '../auth';

export const SeatsPage: React.FC = () => {
  const { showId } = useParams<{ showId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, login } = useAuth();

  // Local state for seat selection and hold confirmation
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [heldSeatIds, setHeldSeatIds] = useState<string[]>([]);
  const [holdData, setHoldData] = useState<HoldResponse | null>(null);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const [holdError, setHoldError] = useState<string | null>(null);

  // Fetch seat map data from GET /shows/{showId}/seats
  const fetchSeatMap = useCallback(
    () => (showId ? fetchSeatsByShowId(showId) : Promise.resolve(null)),
    [showId]
  );

  const {
    data: seatMap,
    loading,
    error,
    refetch,
  } = useAsync<SeatMapData | null>(fetchSeatMap, [fetchSeatMap]);

  // Gracefully handle page refresh by checking sessionStorage for active hold
  useEffect(() => {
    if (!showId) return;

    const storageKey = `cinemaseat_hold_${showId}`;
    const storedHoldStr = sessionStorage.getItem(storageKey);

    if (storedHoldStr) {
      try {
        const storedHold: HoldResponse = JSON.parse(storedHoldStr);
        const expireTime = new Date(storedHold.expiresAt).getTime();

        if (expireTime > Date.now()) {
          setHoldData(storedHold);
          setHeldSeatIds(storedHold.seatIds);
        } else {
          sessionStorage.removeItem(storageKey);
          setHoldError('Your previous seat hold has expired. Please select seats again.');
        }
      } catch {
        sessionStorage.removeItem(storageKey);
      }
    }
  }, [showId]);

  // Cancel hold and release held seats explicitly
  const handleCancelHold = useCallback(() => {
    if (!showId) return;

    if (heldSeatIds.length > 0) {
      updateMockSeatStatuses(showId, heldSeatIds, 'available');
    }

    const storageKey = `cinemaseat_hold_${showId}`;
    sessionStorage.removeItem(storageKey);

    setHoldData(null);
    setHeldSeatIds([]);
    setSelectedSeatIds([]);
    setHoldError(null);

    refetch();
  }, [showId, heldSeatIds, refetch]);

  // Callback triggered when hold timer reaches zero
  const handleHoldExpired = useCallback(() => {
    if (!showId) return;

    const storageKey = `cinemaseat_hold_${showId}`;
    sessionStorage.removeItem(storageKey);

    setHoldData(null);
    setHeldSeatIds([]);
    setSelectedSeatIds([]);
    setHoldError('Your seat hold has expired. Please select seats again.');

    // Refresh seat map from backend truth
    refetch();
  }, [showId, refetch]);

  // Toggle seat selection (Local state ONLY)
  const handleToggleSeat = (seat: SeatType) => {
    // If user already has an active hold and clicks a seat, ask or allow canceling hold first
    if (holdData) return;

    setHoldError(null);

    setSelectedSeatIds((prev) => {
      if (prev.includes(seat.id)) {
        return prev.filter((id) => id !== seat.id);
      }
      if (prev.length >= 4) {
        setHoldError('Maximum 4 seats can be selected per person at a time.');
        return prev;
      }
      return [...prev, seat.id];
    });
  };

  // Perform atomic hold request via POST /holds
  const handleHoldSeats = async () => {
    if (!showId || selectedSeatIds.length === 0) return;

    setIsHolding(true);
    setHoldError(null);

    // Ensure session has an active auth token attached
    if (!isAuthenticated) {
      await login('guest.viewer@cinemaseat.com');
    }

    try {
      const response = await createSeatHold({
        showId,
        seatIds: selectedSeatIds,
      });

      // Hold succeeded
      setHoldData(response);
      setHeldSeatIds(selectedSeatIds);
      setSelectedSeatIds([]);
      sessionStorage.setItem(`cinemaseat_hold_${showId}`, JSON.stringify(response));
    } catch (err: unknown) {
      // Hold failed (e.g. seat taken by another user)
      const errorMsg =
        (err as { message?: string })?.message || 'This seat was just taken by another user.';
      setHoldError(errorMsg);

      // Reset selection and refresh seat map immediately to reflect latest backend truth
      setSelectedSeatIds([]);
      setHeldSeatIds([]);
      setHoldData(null);
      if (showId) {
        sessionStorage.removeItem(`cinemaseat_hold_${showId}`);
      }
      await refetch();
    } finally {
      setIsHolding(false);
    }
  };

  const handleProceedToPayment = () => {
    if (!holdData) return;
    navigate(`/payment/${holdData.holdId}`);
  };

  if (loading) {
    return <LoadingState message="Loading interactive cinema seat map..." type="skeleton" />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load seat layout"
        message={error.message}
        onRetry={refetch}
      />
    );
  }

  if (!seatMap || !seatMap.show) {
    return (
      <EmptyState
        icon={<Film className="w-8 h-8 text-neutral-500" />}
        title="Showtime Not Found"
        description="The requested screening session could not be located."
        actionLabel="Back to Showtimes"
        onAction={() => navigate('/showtimes')}
      />
    );
  }

  const { show, seats } = seatMap;

  // Selected seat objects for summary panel
  const selectedSeats = seats.filter((s) => selectedSeatIds.includes(s.id));
  const heldSeats = seats.filter((s) => heldSeatIds.includes(s.id));

  return (
    <div className="space-y-6 pb-20">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between gap-4">
        <Link to={`/movies/${show.movieId}`}>
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Movie Details
          </Button>
        </Link>

        <Button
          variant="outline"
          size="sm"
          icon={<RefreshCw className="w-3.5 h-3.5 text-neutral-400" />}
          onClick={() => refetch()}
        >
          Refresh Seat Map
        </Button>
      </div>

      {/* Compact Page Header: Movie, Theatre, Showtime, Format */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 md:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-16 rounded-lg bg-neutral-950 border border-neutral-800 overflow-hidden shrink-0">
              <img
                src={show.moviePosterUrl}
                alt={show.movieTitle}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {show.movieTitle}
                </h1>
                <Badge variant="primary" size="sm" className="bg-red-600 text-white font-bold">
                  {show.format}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-xs text-neutral-300 font-medium flex-wrap">
                <span className="font-bold text-white">{show.hallName}</span>
                <span className="text-neutral-600">•</span>
                <span className="text-red-400 font-bold">{show.startTime}</span>
                <span className="text-neutral-600">•</span>
                <span>{show.date}</span>
                <span className="text-neutral-600">•</span>
                <span className="text-neutral-400">{formatDuration(show.durationMinutes)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Seat Map, Right Booking Summary Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Cinema Seat Map Area */}
        <div className="lg:col-span-2 space-y-4">
          <SeatMap
            seatMap={seatMap}
            selectedSeatIds={selectedSeatIds}
            heldSeatIds={heldSeatIds}
            onToggleSeat={handleToggleSeat}
            disabled={isHolding}
          />
        </div>

        {/* Booking Summary Panel */}
        <div className="lg:col-span-1">
          <BookingSummary
            show={show}
            selectedSeats={selectedSeats}
            heldSeats={heldSeats}
            holdData={holdData}
            isHolding={isHolding}
            onHoldSeats={handleHoldSeats}
            onProceedToPayment={handleProceedToPayment}
            onHoldExpired={handleHoldExpired}
            onCancelHold={handleCancelHold}
            error={holdError}
          />
        </div>
      </div>
    </div>
  );
};

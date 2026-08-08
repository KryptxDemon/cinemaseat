import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Ticket, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useAsync } from '../hooks/useAsync';
import { fetchShowtimes } from '../api/showtimes';
import { fetchMovieById } from '../api/movies';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card';
import { formatCurrency, formatTime } from '../utils/formatters';

export const SeatsPage: React.FC = () => {
  const { showId } = useParams<{ showId: string }>();

  const { data: allShowtimes, loading, error, refetch } = useAsync(() => fetchShowtimes(), []);

  const showtime = allShowtimes?.find((s) => s.id === showId);

  const { data: movie } = useAsync(
    () => (showtime?.movieId ? fetchMovieById(showtime.movieId) : Promise.resolve(null)),
    [showtime?.movieId]
  );

  if (loading) {
    return <LoadingState message="Loading seat map configuration..." />;
  }

  if (error) {
    return <ErrorState title="Failed to load seat layout" message={error.message} onRetry={refetch} />;
  }

  if (!showtime) {
    return (
      <div className="space-y-6 text-center py-12">
        <h2 className="text-2xl font-bold text-white">Showtime Session Not Found</h2>
        <p className="text-xs text-neutral-400">
          Showtime ID <code className="text-red-400 font-mono">{showId}</code> could not be loaded.
        </p>
        <Link to="/movies">
          <Button variant="primary" icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Movies
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <div className="flex items-center justify-between gap-4">
        <Link to={`/movies/${showtime.movieId}`}>
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
            Back to Showtimes
          </Button>
        </Link>
        <Badge variant="gold">Seat Reservation Ready</Badge>
      </div>

      {/* Selected Showtime Summary Header */}
      <Card className="bg-neutral-900 border-neutral-800">
        <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="primary" size="sm" className="bg-red-600 text-white font-bold">
                {showtime.format}
              </Badge>
              <span className="text-xs font-mono text-neutral-400">{showtime.date}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {movie?.title || 'Selected Cinema Feature'}
            </h1>
            <p className="text-xs text-neutral-400 font-mono flex items-center gap-2">
              <span className="text-white font-semibold">{showtime.hallName}</span>
              <span>•</span>
              <span className="text-red-400 font-bold">{formatTime(showtime.startTime)}</span>
              <span>•</span>
              <span>{formatCurrency(showtime.priceUSD)} / ticket</span>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1 text-right w-full md:w-auto">
            <span className="text-[10px] text-neutral-500 uppercase font-mono block">Selected Session</span>
            <span className="text-xs font-mono text-red-400 font-bold block">ID: {showtime.id}</span>
            <span className="text-xs text-neutral-300 font-mono block">
              {showtime.availableSeatsCount} seats available
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Screen & Seat Layout Graphic Placeholder */}
      <Card className="bg-neutral-900 border-neutral-800 p-8 text-center space-y-8">
        {/* Curved Cinema Screen */}
        <div className="max-w-xl mx-auto space-y-2">
          <div className="h-2.5 w-full bg-gradient-to-r from-red-600/30 via-red-500 to-red-600/30 rounded-full shadow-lg shadow-red-500/20" />
          <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono font-bold block">
            CINEMA SCREEN THIS WAY
          </span>
        </div>

        {/* Mock Interactive Seat Grid */}
        <div className="max-w-md mx-auto space-y-3 pt-4">
          {['A', 'B', 'C', 'D'].map((row) => (
            <div key={row} className="flex items-center justify-center gap-2 sm:gap-3">
              <span className="text-xs font-mono text-neutral-500 w-4">{row}</span>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((seatNum) => {
                const isTaken = (row === 'A' && seatNum <= 3) || (row === 'C' && seatNum === 5);
                return (
                  <button
                    key={`${row}${seatNum}`}
                    disabled={isTaken}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-md text-[10px] font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${
                      isTaken
                        ? 'bg-neutral-800 text-neutral-600 border border-neutral-800 cursor-not-allowed'
                        : 'bg-neutral-950 hover:bg-red-600 hover:text-white text-neutral-300 border border-neutral-800'
                    }`}
                  >
                    {seatNum}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 pt-4 text-xs font-mono text-neutral-400 border-t border-neutral-800/80">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-neutral-950 border border-neutral-800 inline-block" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-red-600 inline-block" />
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-neutral-800 inline-block" />
            <span>Occupied</span>
          </div>
        </div>
      </Card>
    </div>
  );
};

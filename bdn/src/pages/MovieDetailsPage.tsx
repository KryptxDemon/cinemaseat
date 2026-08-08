import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, Film, Calendar, Star, Building2 } from 'lucide-react';
import { fetchMovieById } from '../api/movies';
import { fetchShowtimesByMovieId } from '../api/showtimes';
import { Showtime } from '../types/showtime';
import { useAsync } from '../hooks/useAsync';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { ShowtimeCard } from '../components/ShowtimeCard';
import { formatDuration } from '../utils/formatters';

export const MovieDetailsPage: React.FC = () => {
  const { movieId } = useParams<{ movieId: string }>();
  const [selectedDate, setSelectedDate] = useState('2026-08-08');

  // Fetch Movie Details
  const {
    data: movie,
    loading: movieLoading,
    error: movieError,
    refetch: refetchMovie,
  } = useAsync(() => (movieId ? fetchMovieById(movieId) : Promise.resolve(null)), [movieId]);

  // Fetch Showtimes for Selected Movie & Date
  const {
    data: showtimes,
    loading: showtimesLoading,
    error: showtimesError,
    refetch: refetchShowtimes,
  } = useAsync<Showtime[]>(
    () => (movieId ? fetchShowtimesByMovieId(movieId, selectedDate) : Promise.resolve([])),
    [movieId, selectedDate]
  );

  const dates = [
    { label: 'Today, Aug 8', value: '2026-08-08' },
    { label: 'Tomorrow, Aug 9', value: '2026-08-09' },
    { label: 'Sunday, Aug 10', value: '2026-08-10' },
  ];

  // Group showtimes by Theatre / Hall
  const showtimesByTheatre = React.useMemo<Record<string, Showtime[]>>(() => {
    if (!showtimes) return {};
    return showtimes.reduce<Record<string, Showtime[]>>((acc, st) => {
      const hall = st.hallName || 'Main Theatre';
      if (!acc[hall]) {
        acc[hall] = [];
      }
      acc[hall].push(st);
      return acc;
    }, {});
  }, [showtimes]);

  if (movieLoading) {
    return <LoadingState message="Loading movie details and showtimes..." type="skeleton" />;
  }

  if (movieError) {
    return (
      <ErrorState
        title="Failed to load movie details"
        message={movieError.message}
        onRetry={refetchMovie}
      />
    );
  }

  if (!movie) {
    return (
      <EmptyState
        icon={<Film className="w-8 h-8 text-neutral-500" />}
        title="Movie Not Found"
        description="The requested movie listing could not be found or is no longer showing."
        actionLabel="Back to All Movies"
        onAction={() => window.history.back()}
      />
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Back Button */}
      <div>
        <Link to="/movies">
          <Button variant="ghost" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
            Back to All Movies
          </Button>
        </Link>
      </div>

      {/* Compact Movie Header Banner */}
      <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
        {movie.bannerUrl && (
          <div className="absolute inset-0 overflow-hidden opacity-25 pointer-events-none">
            <img
              src={movie.bannerUrl}
              alt=""
              className="w-full h-full object-cover filter blur-md scale-105"
            />
            <div className="absolute inset-0 bg-neutral-950/80" />
          </div>
        )}

        <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Movie Poster */}
          <div className="w-28 sm:w-36 aspect-[2/3] rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 shadow-xl shrink-0">
            <img
              src={movie.posterUrl}
              alt={movie.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>

          {/* Compact Movie Info */}
          <div className="space-y-3 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary" size="sm" className="bg-red-600 text-white font-bold">
                {movie.ageRating}
              </Badge>
              <div className="flex items-center gap-1 text-xs text-amber-400 font-mono bg-black/60 px-2 py-0.5 rounded border border-neutral-800">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{movie.rating.toFixed(1)}</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              {movie.title}
            </h1>

            <div className="flex items-center gap-2 text-xs sm:text-sm font-mono text-neutral-300">
              <span className="font-semibold text-white">{formatDuration(movie.durationMinutes)}</span>
              <span className="text-neutral-600">•</span>
              <span className="text-neutral-300">{movie.genres.join(' / ')}</span>
            </div>

            {movie.tagline && (
              <p className="text-xs sm:text-sm font-medium italic text-neutral-400">
                "{movie.tagline}"
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Available Theatres & Showtimes Section */}
      <div className="space-y-6">
        {/* Date Selector Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
              Available Theatres & Showtimes
            </h2>
            <p className="text-xs text-neutral-400">
              Select a screening time to reserve seats
            </p>
          </div>

          {/* Date Picker Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-mono text-neutral-400 flex items-center gap-1 shrink-0 mr-1">
              <Calendar className="w-3.5 h-3.5 text-neutral-500" /> Date:
            </span>
            {dates.map((d) => (
              <button
                key={d.value}
                onClick={() => setSelectedDate(d.value)}
                className={`px-3.5 py-1.5 text-xs font-mono font-medium rounded-lg transition-all cursor-pointer border whitespace-nowrap ${
                  selectedDate === d.value
                    ? 'bg-red-600 text-white border-red-500 font-bold shadow-md shadow-red-950/50'
                    : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {showtimesLoading && (
          <LoadingState message="Checking showtimes schedule across theatres..." />
        )}

        {/* Error State */}
        {showtimesError && (
          <ErrorState
            title="Failed to load showtimes"
            message={showtimesError.message}
            onRetry={refetchShowtimes}
          />
        )}

        {/* No Showtimes State */}
        {!showtimesLoading && !showtimesError && showtimes && showtimes.length === 0 && (
          <EmptyState
            icon={<Clock className="w-8 h-8 text-neutral-500" />}
            title="No Showtimes Scheduled"
            description="There are currently no active screenings for this movie on the selected date."
          />
        )}

        {/* Showtimes Organized by Theatre */}
        {!showtimesLoading && !showtimesError && showtimes && showtimes.length > 0 && (
          <div className="space-y-8">
            {(Object.entries(showtimesByTheatre) as [string, Showtime[]][]).map(([theatreName, theatreShowtimes]) => (
              <div key={theatreName} className="space-y-3">
                {/* Theatre Group Header */}
                <div className="flex items-center gap-2.5 text-sm font-bold text-white bg-neutral-900/60 border border-neutral-800/80 px-4 py-2.5 rounded-xl">
                  <Building2 className="w-4 h-4 text-red-500" />
                  <span>{theatreName}</span>
                  <span className="text-xs font-mono text-neutral-500 font-normal ml-auto">
                    {theatreShowtimes.length} screening{theatreShowtimes.length > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Showtime Cards Grid for this Theatre */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-0 sm:pl-2">
                  {theatreShowtimes.map((st) => (
                    <ShowtimeCard key={st.id} showtime={st} showTheatreName={false} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

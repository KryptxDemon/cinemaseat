import React from 'react';
import { Link } from 'react-router-dom';
import { Film, Zap, ShieldCheck, ArrowRight, Clock, Calendar, Ticket, Sparkles } from 'lucide-react';
import { Button } from '../components/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/Card';
import { Badge } from '../components/Badge';
import { SectionHeader } from '../components/SectionHeader';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { useAsync } from '../hooks/useAsync';
import { getMovies } from '../api/movies';
import { formatDuration, formatCurrency } from '../utils/formatters';

export const HomePage: React.FC = () => {
  const { data: movies, loading, error, refetch } = useAsync(() => getMovies(), []);

  return (
    <div className="space-y-12 pb-16">
      {/* Overview Hero Section */}
      <section className="relative rounded-2xl bg-neutral-900 border border-neutral-800 p-6 md:p-10 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/60 border border-red-800/60 text-red-400 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-red-500" />
            <span>Next-Generation Cinema Ticketing</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Welcome to <span className="text-[#E50914]">CinemaSeat</span>
          </h1>

          <p className="text-base text-neutral-300 leading-relaxed max-w-2xl">
            Book seats for the latest blockbuster movies in IMAX, 3D, and Premium Dolby Digital halls. Experience seamless real-time seat locking and instant booking confirmations.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link to="/movies">
              <Button variant="primary" size="md" icon={<Film className="w-4 h-4" />}>
                Browse Movies
              </Button>
            </Link>
            <Link to="/showtimes">
              <Button variant="secondary" size="md" icon={<Calendar className="w-4 h-4" />}>
                View Showtimes
              </Button>
            </Link>
          </div>
        </div>

        {/* System Highlights */}
        <div className="mt-8 pt-8 border-t border-neutral-800/80 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-neutral-400">
          <div className="space-y-1">
            <span className="text-neutral-500 block">Experience</span>
            <span className="text-neutral-200 font-semibold flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-red-500" /> IMAX & 3D Formats
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-neutral-500 block">Reservation</span>
            <span className="text-neutral-200 font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Instant 10-Min Seat Hold
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-neutral-500 block">Seat Maps</span>
            <span className="text-neutral-200 font-semibold flex items-center gap-1.5">
              <Ticket className="w-3.5 h-3.5 text-emerald-500" /> Live Interactive Grid
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-neutral-500 block">Security</span>
            <span className="text-neutral-200 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" /> Instant QR Confirmation
            </span>
          </div>
        </div>
      </section>

      {/* Featured Movie Catalog */}
      <section className="space-y-6">
        <SectionHeader
          title="Featured Releases"
          subtitle="Showing active cinema releases ready for seat selection"
          badge={<Badge variant="primary">Now Showing</Badge>}
          action={
            <Link to="/movies">
              <Button variant="ghost" size="sm" icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
                View All Movies
              </Button>
            </Link>
          }
        />

        {loading && <LoadingState message="Loading movie catalog..." />}

        {error && (
          <ErrorState
            title="Failed to load movies"
            message={error.message}
            onRetry={refetch}
          />
        )}

        {!loading && !error && movies && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {movies.slice(0, 3).map((movie) => (
              <Card key={movie.id} interactive className="flex flex-col h-full group bg-neutral-900 border-neutral-800">
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-950">
                  <img
                    src={movie.bannerUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/20 to-transparent"></div>

                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <Badge variant="primary" size="sm">
                      {movie.ageRating}
                    </Badge>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white font-medium">
                    <span className="flex items-center gap-1 text-xs bg-neutral-950/80 px-2 py-1 rounded border border-neutral-800 backdrop-blur-xs">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" /> {formatDuration(movie.durationMinutes)}
                    </span>
                    <span className="text-xs bg-neutral-950/80 px-2 py-1 rounded border border-neutral-800 backdrop-blur-xs font-semibold">
                      {movie.releaseYear}
                    </span>
                  </div>
                </div>

                <CardHeader className="pb-2">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {movie.genres.map((g) => (
                      <span
                        key={g}
                        className="text-xs font-semibold uppercase tracking-wider text-red-400 bg-red-950/40 border border-red-800/50 px-2 py-0.5 rounded"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                  <CardTitle className="text-white text-lg">{movie.title}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-1 text-neutral-300 text-xs leading-relaxed">{movie.synopsis}</CardDescription>
                </CardHeader>

                <CardContent className="mt-auto pt-2 text-xs text-neutral-300 space-y-1">
                  <div>
                    <span className="text-neutral-400">Director:</span>{' '}
                    <span className="text-neutral-200 font-semibold">{movie.director}</span>
                  </div>
                </CardContent>

                <CardFooter className="border-t border-neutral-800/80 pt-4 mt-2">
                  <span className="text-xs text-neutral-300 font-medium">
                    From <span className="text-emerald-400 font-bold">{formatCurrency(400)}</span>
                  </span>
                  <Link to={`/movies/${movie.id}`}>
                    <Button variant="primary" size="sm" icon={<Calendar className="w-3.5 h-3.5" />}>
                      Select Seats
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

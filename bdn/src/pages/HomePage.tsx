import React from 'react';
import { Link } from 'react-router-dom';
import { Film, Zap, Server, Database, ShieldCheck, ArrowRight, Clock, Star, Layers, Calendar } from 'lucide-react';
import { Button } from '../components/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/Card';
import { Badge } from '../components/Badge';
import { SectionHeader } from '../components/SectionHeader';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { useAsync } from '../hooks/useAsync';
import { fetchMovies } from '../api/movies';
import { formatDuration, formatCurrency } from '../utils/formatters';

export const HomePage: React.FC = () => {
  const { data: movies, loading, error, refetch } = useAsync(() => fetchMovies(), []);

  return (
    <div className="space-y-12 pb-16">
      {/* Overview Hero Section */}
      <section className="relative rounded-2xl bg-white border border-slate-200 p-6 md:p-10 overflow-hidden shadow-xs">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-medium">
            <Zap className="w-3.5 h-3.5 text-emerald-600" />
            <span>High-Concurrency Booking System Foundation</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Cinema<span className="text-emerald-600">Seat</span> Frontend Architecture
          </h1>

          <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
            A simple, production-ready frontend interface for high-demand ticket booking. Engineered for seamless connection with a FastAPI and PostgreSQL backend.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link to="/movies">
              <Button variant="primary" size="md" icon={<Film className="w-4 h-4" />}>
                Explore Movies
              </Button>
            </Link>
            <Link to="/design-system">
              <Button variant="outline" size="md" icon={<Layers className="w-4 h-4" />}>
                Design Tokens
              </Button>
            </Link>
          </div>
        </div>

        {/* Architecture Spec Highlights */}
        <div className="mt-8 pt-8 border-t border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono text-slate-500">
          <div className="space-y-1">
            <span className="text-slate-400 block">State Engine</span>
            <span className="text-slate-800 font-semibold flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-emerald-600" /> React + Fetch API
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-400 block">Target Backend</span>
            <span className="text-slate-800 font-semibold flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-amber-600" /> FastAPI + AsyncPG
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-400 block">Concurrency Goal</span>
            <span className="text-slate-800 font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-600" /> Seat Lock Safety
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-slate-400 block">UI Theme</span>
            <span className="text-slate-800 font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Light Off-White
            </span>
          </div>
        </div>
      </section>

      {/* Featured Movie Catalog (3 Placeholders) */}
      <section className="space-y-6">
        <SectionHeader
          title="Featured Movie Placeholders"
          subtitle="Showing active 2D and 3D cinema releases ready for ticket selection"
          badge={<Badge variant="primary">3 Releases</Badge>}
          action={
            <Link to="/movies">
              <Button variant="ghost" size="sm" icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
                View Full List
              </Button>
            </Link>
          }
        />

        {loading && <LoadingState message="Fetching current movie catalog..." />}

        {error && (
          <ErrorState
            title="Failed to load movies"
            message={error.message}
            onRetry={refetch}
          />
        )}

        {!loading && !error && movies && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {movies.map((movie) => (
              <Card key={movie.id} interactive className="flex flex-col h-full group">
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-100">
                  <img
                    src={movie.bannerUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/10 to-transparent"></div>

                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <Badge variant="primary" size="sm">
                      {movie.ageRating}
                    </Badge>
                    <Badge variant="gold" size="sm" icon={<Star className="w-3 h-3 fill-amber-500 text-amber-500" />}>
                      {movie.rating.toFixed(1)}
                    </Badge>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white font-medium">
                    <span className="flex items-center gap-1 font-mono text-[11px] bg-slate-900/80 px-2 py-0.5 rounded backdrop-blur-xs">
                      <Clock className="w-3 h-3 text-slate-300" /> {formatDuration(movie.durationMinutes)}
                    </span>
                    <span className="font-mono text-[11px] bg-slate-900/80 px-2 py-0.5 rounded backdrop-blur-xs">
                      {movie.releaseYear}
                    </span>
                  </div>
                </div>

                <CardHeader className="pb-2">
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {movie.genres.map((g) => (
                      <span
                        key={g}
                        className="text-[10px] uppercase tracking-wider font-mono text-emerald-800 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                  <CardTitle>{movie.title}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-1">{movie.synopsis}</CardDescription>
                </CardHeader>

                <CardContent className="mt-auto pt-2 text-xs text-slate-500 space-y-1">
                  <div>
                    <span className="text-slate-400 font-mono">Director:</span>{' '}
                    <span className="text-slate-700 font-medium">{movie.director}</span>
                  </div>
                </CardContent>

                <CardFooter>
                  <span className="text-xs text-slate-600 font-mono">
                    From <span className="text-emerald-700 font-bold">{formatCurrency(14.5)}</span>
                  </span>
                  <Link to="/showtimes">
                    <Button variant="primary" size="sm" icon={<Calendar className="w-3.5 h-3.5" />}>
                      Book Seats
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Backend Contract Card */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 md:p-8 space-y-6 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-5 h-5 text-emerald-600" /> FastAPI Endpoint Integration Contract
            </h3>
            <p className="text-xs text-slate-500">
              Frontend API client is decoupled and configured for immediate production integration.
            </p>
          </div>
          <Badge variant="outline" className="font-mono text-[10px]">
            REST / OpenAPI
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-emerald-700">GET /api/v1/movies</span>
              <Badge variant="neutral" size="sm">JSON</Badge>
            </div>
            <p className="text-xs text-slate-600">
              Returns list of active cinema titles with genre filters and duration metadata.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-emerald-700">GET /api/v1/showtimes</span>
              <Badge variant="neutral" size="sm">JSON</Badge>
            </div>
            <p className="text-xs text-slate-600">
              Returns hall assignments, audio format (IMAX/Dolby/2D/3D), pricing, and remaining seat counts.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-amber-700">POST /api/v1/bookings</span>
              <Badge variant="warning" size="sm">Pydantic</Badge>
            </div>
            <p className="text-xs text-slate-600">
              Reserved for atomic seat reservation lock execution under concurrent traffic.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Film, Search, Filter, Play, Info, Star, Calendar, Clock } from 'lucide-react';
import { MovieCard } from '../components/MovieCard';
import { LoadingState } from '../components/LoadingState';
import { ErrorState } from '../components/ErrorState';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { useAsync } from '../hooks/useAsync';
import { fetchMovies } from '../api/movies';
import { Genre } from '../types/movie';
import { formatDuration } from '../utils/formatters';

const GENRES: (Genre | 'All')[] = ['All', 'Action', 'Sci-Fi', 'Adventure', 'Thriller', 'Drama'];

export const MoviesPage: React.FC = () => {
  const [selectedGenre, setSelectedGenre] = useState<Genre | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const {
    data: movies,
    loading,
    error,
    refetch,
  } = useAsync(
    () => fetchMovies({ genre: selectedGenre, search: searchQuery }),
    [selectedGenre, searchQuery]
  );

  // Find a featured movie for the hero banner
  const featuredMovie = movies && movies.length > 0 ? (movies.find(m => m.isFeatured) || movies[0]) : null;

  return (
    <div className="space-y-10 pb-16">
      {/* Featured Netflix-style Hero Banner */}
      {!loading && !error && featuredMovie && !searchQuery && selectedGenre === 'All' && (
        <div className="relative w-full rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-800 shadow-2xl min-h-[380px] sm:min-h-[440px] flex items-end">
          {/* Banner Image Background */}
          {featuredMovie.bannerUrl ? (
            <img
              src={featuredMovie.bannerUrl}
              alt={featuredMovie.title}
              className="absolute inset-0 w-full h-full object-cover object-center opacity-40 filter brightness-90"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-900 to-red-950 opacity-90" />
          )}

          {/* Vignette Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/80 to-transparent" />

          {/* Hero Content Overlay */}
          <div className="relative z-10 p-6 sm:p-10 max-w-2xl space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold tracking-widest text-[#E50914] uppercase bg-red-950/80 px-2.5 py-1 rounded border border-red-800/60 font-mono">
                Featured Spotlight
              </span>
              <Badge variant="primary" size="sm" className="bg-red-600 text-white font-bold">
                {featuredMovie.ageRating}
              </Badge>
              <div className="flex items-center gap-1 text-xs text-amber-400 font-mono bg-black/60 px-2 py-0.5 rounded border border-neutral-800">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{featuredMovie.rating.toFixed(1)}</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-none drop-shadow-md">
              {featuredMovie.title}
            </h1>

            <p className="text-xs sm:text-sm text-neutral-300 line-clamp-2 leading-relaxed max-w-xl">
              {featuredMovie.synopsis}
            </p>

            <div className="flex items-center gap-4 text-xs font-mono text-neutral-400 pt-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-neutral-500" />
                {formatDuration(featuredMovie.durationMinutes)}
              </span>
              <span>•</span>
              <span className="text-neutral-300 font-semibold">{featuredMovie.releaseYear}</span>
              <span>•</span>
              <span className="truncate">{featuredMovie.genres.join(', ')}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Link to={`/movies/${featuredMovie.id}`}>
                <Button
                  variant="primary"
                  size="lg"
                  icon={<Play className="w-4 h-4 fill-white" />}
                  className="shadow-xl"
                >
                  Book Tickets
                </Button>
              </Link>
              <Link to={`/movies/${featuredMovie.id}`}>
                <Button
                  variant="secondary"
                  size="lg"
                  icon={<Info className="w-4 h-4" />}
                  className="bg-neutral-800/90 text-white border-neutral-700 hover:bg-neutral-700"
                >
                  More Info
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="bg-neutral-900/90 border border-neutral-800 p-4 rounded-xl space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-4 shadow-xl">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search movie title, director or actor..."
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-white cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Genre Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <span className="text-xs font-mono text-neutral-400 flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3.5 h-3.5" /> Genre:
          </span>
          {GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer whitespace-nowrap ${
                selectedGenre === genre
                  ? 'bg-red-600 text-white font-bold shadow-md shadow-red-950/50'
                  : 'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-750 border border-neutral-750'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <h2 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <span className="w-2 h-6 bg-red-600 rounded-full inline-block" />
          {selectedGenre === 'All' ? 'Trending Cinema Releases' : `${selectedGenre} Movies`}
        </h2>
        <span className="text-xs font-mono text-neutral-400">
          {movies ? `${movies.length} Title${movies.length === 1 ? '' : 's'}` : ''}
        </span>
      </div>

      {/* Async States: Loading / Error / Empty / Grid */}
      {loading && <LoadingState message="Fetching active cinema listings..." type="skeleton" />}

      {error && (
        <ErrorState
          title="Unable to load movies"
          message={error.message || 'Error communicating with movie server.'}
          onRetry={refetch}
        />
      )}

      {!loading && !error && movies && movies.length === 0 && (
        <EmptyState
          icon={<Film className="w-8 h-8 text-neutral-500" />}
          title="No movies found"
          description={`No current movies matched your search "${searchQuery || selectedGenre}".`}
          actionLabel="Reset Search & Filters"
          onAction={() => {
            setSelectedGenre('All');
            setSearchQuery('');
          }}
        />
      )}

      {!loading && !error && movies && movies.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
      )}
    </div>
  );
};

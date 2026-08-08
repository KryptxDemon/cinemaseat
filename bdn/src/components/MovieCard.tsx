import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Film, Play, Star } from 'lucide-react';
import { Movie } from '../types/movie';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { formatDuration } from '../utils/formatters';

interface MovieCardProps {
  movie: Movie;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <Card
      interactive
      className="flex flex-col h-full group overflow-hidden bg-neutral-900 border-neutral-800 hover:border-red-600/50 hover:scale-[1.03] hover:z-20 transition-all duration-300 ease-out shadow-xl"
    >
      {/* Movie Poster Area with Gradient Overlay */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-neutral-950 flex items-center justify-center">
        {!imgError && movie.posterUrl ? (
          <img
            src={movie.posterUrl}
            alt={`${movie.title} poster`}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          /* Netflix Dark Poster Fallback */
          <div className="w-full h-full bg-gradient-to-br from-neutral-900 via-neutral-950 to-red-950 p-6 flex flex-col items-center justify-between text-center relative">
            <div className="w-12 h-12 rounded-full bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-500 mt-6">
              <Film className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-mono tracking-widest text-red-500 uppercase">Netflix Original</span>
              <h4 className="text-lg font-bold text-white leading-tight">{movie.title}</h4>
            </div>
            <span className="text-[10px] font-mono text-neutral-500 mb-2">CinemaSeat Official Screening</span>
          </div>
        )}

        {/* Gradient vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-black/40 opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Top Badges overlay */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-1.5 z-10">
          <Badge variant="primary" size="sm" className="bg-red-600 text-white border-red-500/40 shadow-md font-bold">
            {movie.ageRating}
          </Badge>
          <div className="flex items-center gap-1 bg-black/75 px-2 py-0.5 rounded text-[11px] font-mono text-amber-400 border border-neutral-800 backdrop-blur-xs">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span>{movie.rating.toFixed(1)}</span>
          </div>
        </div>

        {/* Quick Play Hover Indicator */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-900/50 transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-6 h-6 fill-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* Card Content Header */}
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex flex-wrap gap-1 mb-1.5">
          {movie.genres.map((g) => (
            <span
              key={g}
              className="text-[10px] font-mono tracking-wider text-neutral-300 bg-neutral-800/90 border border-neutral-700/80 px-2 py-0.5 rounded font-medium"
            >
              {g}
            </span>
          ))}
        </div>

        <CardTitle className="text-base font-bold text-white group-hover:text-red-500 transition-colors line-clamp-1">
          {movie.title}
        </CardTitle>
      </CardHeader>

      {/* Card Metadata */}
      <CardContent className="px-4 py-1 text-xs text-neutral-400 space-y-2">
        <div className="flex items-center gap-3 text-neutral-400 font-mono text-[11px]">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-neutral-500" />
            {formatDuration(movie.durationMinutes)}
          </span>
          <span className="text-neutral-600">•</span>
          <span className="truncate">
            Dir: <span className="text-neutral-200 font-medium">{movie.director}</span>
          </span>
        </div>
      </CardContent>

      {/* Primary Action Button */}
      <CardFooter className="px-4 pb-4 pt-3 border-t border-neutral-800/80 mt-auto">
        <Link to={`/movies/${movie.id}`} className="w-full">
          <Button
            variant="primary"
            size="md"
            className="w-full justify-center group-hover:bg-red-600 group-hover:brightness-110"
            icon={<Play className="w-3.5 h-3.5 fill-current" />}
            iconPosition="left"
          >
            Get Tickets
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

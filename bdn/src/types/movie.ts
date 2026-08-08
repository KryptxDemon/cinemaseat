export type Genre =
  | 'Action'
  | 'Adventure'
  | 'Sci-Fi'
  | 'Drama'
  | 'Thriller'
  | 'Comedy'
  | 'Horror'
  | 'Animation'
  | 'Crime'
  | 'Mystery';

export type AgeRating = 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17';

export interface Movie {
  id: string;
  title: string;
  tagline?: string;
  synopsis: string;
  durationMinutes: number;
  releaseYear: number;
  rating: number; // e.g. 8.8 out of 10
  ageRating: AgeRating;
  genres: Genre[];
  posterUrl: string;
  bannerUrl: string;
  director: string;
  cast: string[];
  isFeatured?: boolean;
}

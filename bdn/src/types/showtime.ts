export type FormatType = 'Standard 2D' | 'IMAX 3D' | 'Dolby Cinema' | '4DX';

export interface Hall {
  id: string;
  name: string;
  totalSeats: number;
}

export interface Showtime {
  id: string;
  movieId: string;
  hallId: string;
  hallName: string;
  startTime: string; // ISO date string or HH:MM
  date: string; // YYYY-MM-DD
  format: FormatType;
  priceUSD: number;
  availableSeatsCount: number;
}

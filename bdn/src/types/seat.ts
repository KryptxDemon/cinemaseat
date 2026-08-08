export type SeatStatus = 'available' | 'selected' | 'held' | 'booked';
export type SeatTier = 'standard' | 'premium' | 'vip';

export interface Seat {
  /** show_seats.id (per-show row). Used to identify a seat in this show. */
  id: string;
  /** Physical seats.id from the backend. Needed when calling POST /holds. */
  seatId: string;
  row: string;
  number: number;
  tier: SeatTier;
  priceUSD: number;
  status: SeatStatus;
}

export interface ShowDetails {
  id: string;
  movieId: string;
  movieTitle: string;
  moviePosterUrl: string;
  durationMinutes: number;
  genre: string;
  hallName: string;
  format: string;
  startTime: string;
  date: string;
  screenInfo?: string;
  basePriceUSD: number;
}

export interface SeatMapData {
  show: ShowDetails;
  rows: string[];
  seatsPerRow: number;
  aisleAfterNumber: number[];
  seats: Seat[];
}

export interface CreateHoldRequest {
  showId: string;
  seatIds: string[];
}

export interface HoldResponse {
  holdId: string;
  showId: string;
  seatIds: string[];
  expiresAt: string;
  expiresInSeconds: number;
  totalPriceUSD: number;
  status: 'active' | 'expired' | 'failed';
}

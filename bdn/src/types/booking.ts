export interface BookingDetails {
  bookingId: string;
  movieId?: string;
  movieTitle: string;
  moviePosterUrl?: string;
  hallName: string;
  showtime: string;
  date: string;
  format: string;
  seats: string[];
  seatsFormatted: string;
  totalAmountUSD: number;
  totalAmountBDT?: number;
  status: 'confirmed' | 'cancelled' | 'pending' | 'failed';
  createdAt: string;
  paymentRef?: string;
}

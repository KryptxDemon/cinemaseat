/**
 * CinemaSeat booking service.
 *
 * Thin wrappers around the FastAPI backend for the booking flow:
 *   GET    /movies
 *   GET    /shows/{show_id}/seats
 *   POST   /holds
 *   GET    /bookings/{booking_id}
 *   GET    /bookings/{booking_id}/ticket
 *
 * All response shapes are kept loose (record-based) so the backend
 * contract can be adjusted without breaking the UI.
 */

import { apiRequest, apiRequestBlob } from './api';

export interface Movie {
  id: string;
  title: string;
  [k: string]: unknown;
}

export interface Seat {
  id: string;
  row?: string;
  number?: number;
  priceUSD?: number;
  status?: string;
  [k: string]: unknown;
}

export interface ShowDetails {
  id: string;
  movieId?: string;
  movieTitle?: string;
  hallName?: string;
  startTime?: string;
  date?: string;
  format?: string;
  [k: string]: unknown;
}

export interface SeatMapData {
  show: ShowDetails;
  seats: Seat[];
  rows?: string[];
  seatsPerRow?: number;
  aisleAfterNumber?: number[];
  [k: string]: unknown;
}

export interface CreateHoldRequest {
  showId: string;
  seatIds: string[];
}

export interface HoldResponse {
  holdId: string;
  showId: string;
  seatIds: string[];
  expiresAt?: string;
  expiresInSeconds?: number;
  totalPriceUSD?: number;
  status?: 'active' | 'expired' | 'failed';
  [k: string]: unknown;
}

export interface BookingCustomer {
  name: string;
  phone: string;
  email: string;
}

export interface BookingDetails {
  bookingId: string;
  movieTitle?: string;
  hallName?: string;
  showtime?: string;
  date?: string;
  format?: string;
  seatIds?: string[];
  seats?: string[];
  seatsFormatted?: string;
  totalAmountUSD?: number;
  status?: string;
  customer?: BookingCustomer;
  [k: string]: unknown;
}

export async function getMovies(): Promise<Movie[]> {
  return apiRequest<Movie[]>('/movies');
}

export async function getShowSeats(showId: string): Promise<SeatMapData> {
  return apiRequest<SeatMapData>(`/shows/${encodeURIComponent(showId)}/seats`);
}

export async function createHold(req: CreateHoldRequest): Promise<HoldResponse> {
  return apiRequest<HoldResponse>('/holds', {
    method: 'POST',
    body: req,
  });
}

export async function getBooking(bookingId: string): Promise<BookingDetails> {
  return apiRequest<BookingDetails>(`/bookings/${encodeURIComponent(bookingId)}`);
}

/**
 * Download the PDF ticket for a confirmed booking.
 * The backend returns the PDF bytes; the frontend does NOT generate a PDF.
 */
export async function downloadTicketPdf(bookingId: string): Promise<Blob> {
  return apiRequestBlob(`/bookings/${encodeURIComponent(bookingId)}/ticket`);
}

/**
 * Trigger a browser download for the PDF Blob returned by the backend.
 */
export function savePdfBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

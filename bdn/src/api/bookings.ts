import { apiClient } from './client';
import { CreateHoldRequest, HoldResponse } from '../types/seat';
import { BookingDetails } from '../types/booking';
import { getSeats, updateMockSeatStatuses } from './seats';
import { ApiError } from '../types/api';

// In-memory store for mock mode bookings
const mockBookingStore: Record<string, BookingDetails> = {};

export function saveMockBooking(booking: BookingDetails) {
  mockBookingStore[booking.bookingId] = booking;
  try {
    sessionStorage.setItem(`cinemaseat_booking_${booking.bookingId}`, JSON.stringify(booking));
  } catch {
    // ignore session storage error
  }
}

/**
 * POST /holds
 * Requests an atomic seat hold on the server.
 */
export async function holdSeat(showIdOrRequest: string | CreateHoldRequest, seatIdsArg?: string[]): Promise<HoldResponse> {
  const request: CreateHoldRequest =
    typeof showIdOrRequest === 'string'
      ? { showId: showIdOrRequest, seatIds: seatIdsArg || [] }
      : showIdOrRequest;

  if (!apiClient.isMockMode) {
    try {
      // The seat map returns rows whose `id` is the *show_seat* id, but the
      // backend's POST /holds filter operates on the physical *seat* id
      // (show_seats.seat_id). Look up the seat map once to translate.
      const seatMap = await getSeats(request.showId);
      const physicalSeatIds = seatMap.seats
        .filter((s) => request.seatIds.includes(s.id))
        .map((s) => s.seatId);

      const backendPayload = {
        showId: request.showId,
        seatIds: physicalSeatIds,
      };

      return await apiClient.request<HoldResponse>('/holds', {
        method: 'POST',
        body: JSON.stringify(backendPayload),
      });
    } catch (err) {
      if ((err as ApiError)?.statusCode === 409 || (err as ApiError)?.statusCode === 400) {
        throw err; // Re-throw business logic errors like seat taken
      }
      console.warn('Backend API unavailable, processing mock hold:', err);
    }
  }

  await apiClient.simulateLatency(350);

  const seatMap = await getSeats(request.showId);
  const requestedSeats = seatMap.seats.filter((s) => request.seatIds.includes(s.id));

  // Check if any seat is already taken
  const unavailableSeat = requestedSeats.find(
    (s) => s.status === 'booked' || s.status === 'held'
  );

  if (unavailableSeat) {
    const error: ApiError = {
      statusCode: 409,
      message: 'This seat was just taken by another user.',
      details: { seatId: unavailableSeat.id },
    };
    throw error;
  }

  if (requestedSeats.length === 0) {
    const error: ApiError = {
      statusCode: 400,
      message: 'No valid seats selected.',
    };
    throw error;
  }

  const totalPriceUSD = requestedSeats.reduce((sum, s) => sum + s.priceUSD, 0);

  updateMockSeatStatuses(request.showId, request.seatIds, 'held');

  const expiresInSeconds = 600; // 10 minutes
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

  const holdResponse: HoldResponse = {
    holdId: `hold-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    showId: request.showId,
    seatIds: request.seatIds,
    expiresAt,
    expiresInSeconds,
    totalPriceUSD: Number(totalPriceUSD.toFixed(2)),
    status: 'active',
  };

  return holdResponse;
}

/**
 * GET /bookings/{booking_id}
 * Fetches confirmed booking details by booking_id
 */
export async function getBooking(bookingId: string): Promise<BookingDetails> {
  if (!apiClient.isMockMode) {
    try {
      return await apiClient.request<BookingDetails>(`/bookings/${bookingId}`);
    } catch (err) {
      if ((err as ApiError)?.statusCode === 404) {
        throw err; // Re-throw 404 if booking genuinely not found
      }
      console.warn('Backend API unavailable, fetching mock booking:', err);
    }
  }

  await apiClient.simulateLatency(300);

  if (mockBookingStore[bookingId]) {
    return mockBookingStore[bookingId];
  }

  try {
    const stored = sessionStorage.getItem(`cinemaseat_booking_${bookingId}`);
    if (stored) {
      const parsed: BookingDetails = JSON.parse(stored);
      mockBookingStore[bookingId] = parsed;
      return parsed;
    }
  } catch {
    // ignore parsing error
  }

  if (bookingId === 'not-found' || bookingId === '404' || bookingId === 'invalid') {
    const error: ApiError = {
      statusCode: 404,
      message: `Booking reference '${bookingId}' could not be located in the reservation system.`,
    };
    throw error;
  }

  const fallbackBooking: BookingDetails = {
    bookingId,
    movieTitle: 'Inception: 10th Anniversary',
    moviePosterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop',
    hallName: 'IMAX Laser Hall 1',
    showtime: '19:30',
    date: '2026-08-08',
    format: 'IMAX 3D',
    seats: ['E6', 'E7'],
    seatsFormatted: 'E6, E7',
    totalAmountUSD: 29.50,
    totalAmountBDT: 3245,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
    paymentRef: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
  };

  saveMockBooking(fallbackBooking);
  return fallbackBooking;
}

// Backward compatibility aliases
export const createSeatHold = holdSeat;
export const createHold = holdSeat;
export const fetchBookingById = getBooking;

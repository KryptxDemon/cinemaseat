import { apiClient } from './client';
import { BookingDetails } from '../types/booking';
import { ApiError } from '../types/api';

// In-memory store for created bookings during the session
const mockBookingStore: Record<string, BookingDetails> = {};

/**
 * Register a completed booking in the mock store so GET /bookings/{booking_id} can retrieve it
 */
export function saveMockBooking(booking: BookingDetails) {
  mockBookingStore[booking.bookingId] = booking;
  try {
    sessionStorage.setItem(`cinemaseat_booking_${booking.bookingId}`, JSON.stringify(booking));
  } catch {
    // sessionStorage fallback
  }
}

/**
 * GET /bookings/{booking_id}
 * Fetches confirmed booking details by booking_id
 */
export async function fetchBookingById(bookingId: string): Promise<BookingDetails> {
  if (apiClient.isMockMode) {
    await apiClient.simulateLatency(350);

    // 1. Check in-memory store first
    if (mockBookingStore[bookingId]) {
      return mockBookingStore[bookingId];
    }

    // 2. Check sessionStorage
    try {
      const stored = sessionStorage.getItem(`cinemaseat_booking_${bookingId}`);
      if (stored) {
        const parsed: BookingDetails = JSON.parse(stored);
        mockBookingStore[bookingId] = parsed;
        return parsed;
      }
    } catch {
      // ignore parse error
    }

    // 3. Fallback for test IDs (unless explicitly asking for invalid)
    if (bookingId === 'not-found' || bookingId === '404' || bookingId === 'invalid') {
      const error: ApiError = {
        statusCode: 404,
        message: `Booking reference '${bookingId}' could not be located in the reservation system.`,
      };
      throw error;
    }

    // Fallback generated mock booking for direct links or holds
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

  return apiClient.request<BookingDetails>(`/bookings/${bookingId}`);
}

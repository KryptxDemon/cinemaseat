/**
 * CinemaSeat payment service.
 *
 * Thin wrappers around the FastAPI backend for the payment flow:
 *   POST /payments
 *   GET  /bookings/{booking_id}      (used for status polling)
 *
 * The frontend decides:
 *   - Show "Payment processing..." while status === 'pending'
 *   - Stop polling once status === 'successful' or 'failed'
 *
 * The backend is responsible for talking to the mock payment gateway.
 */

import { apiRequest, ApiError } from './api';
import { getBooking, BookingCustomer, BookingDetails } from './bookingService';

export type PaymentStatus = 'pending' | 'successful' | 'failed';

export interface PaymentRequest {
  holdId: string;
  customer: BookingCustomer;
  amountUSD?: number;
  paymentMethod?: string;
}

export interface PaymentResponse {
  paymentId?: string;
  bookingId?: string;
  holdId?: string;
  status: PaymentStatus;
  amountUSD?: number;
  [k: string]: unknown;
}

export async function createPayment(req: PaymentRequest): Promise<PaymentResponse> {
  return apiRequest<PaymentResponse>('/payments', {
    method: 'POST',
    body: {
      holdId: req.holdId,
      customer: {
        name: req.customer.name,
        phone: req.customer.phone,
        email: req.customer.email,
      },
      amountUSD: req.amountUSD,
      paymentMethod: req.paymentMethod ?? 'mock_gateway',
    },
  });
}

/**
 * Poll the booking record until payment reaches a final state.
 * The backend controls callback/processing; the frontend just waits.
 */
export async function pollBookingUntilFinal(
  bookingId: string,
  options: { intervalMs?: number; timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<BookingDetails> {
  const intervalMs = options.intervalMs ?? 2000;
  const timeoutMs = options.timeoutMs ?? 5 * 60 * 1000; // 5 minutes
  const start = Date.now();

  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (options.signal?.aborted) {
      throw new Error('Polling cancelled');
    }

    const booking = await getBooking(bookingId);
    const status = String(booking.status ?? '').toLowerCase();

    if (status === 'confirmed' || status === 'paid' || status === 'successful') {
      return booking;
    }
    if (status === 'failed' || status === 'cancelled' || status === 'expired') {
      return booking;
    }

    if (Date.now() - start > timeoutMs) {
      throw new Error('Payment status polling timed out.');
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

export function isFinalStatus(status: string | undefined | null): boolean {
  if (!status) return false;
  const s = String(status).toLowerCase();
  return s === 'confirmed' || s === 'paid' || s === 'successful' ||
    s === 'failed' || s === 'cancelled' || s === 'expired';
}

export function isSuccessfulStatus(status: string | undefined | null): boolean {
  if (!status) return false;
  const s = String(status).toLowerCase();
  return s === 'confirmed' || s === 'paid' || s === 'successful';
}

export type { ApiError };

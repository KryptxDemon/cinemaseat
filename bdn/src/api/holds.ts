import { apiClient } from './client';
import { CreateHoldRequest, HoldResponse } from '../types/seat';
import { fetchSeatsByShowId, updateMockSeatStatuses } from './seats';
import { ApiError } from '../types/api';

/**
 * POST /holds
 * Requests an atomic seat hold on the server.
 */
export async function createSeatHold(request: CreateHoldRequest): Promise<HoldResponse> {
  if (apiClient.isMockMode) {
    await apiClient.simulateLatency(350);

    const seatMap = await fetchSeatsByShowId(request.showId);
    const requestedSeats = seatMap.seats.filter((s) => request.seatIds.includes(s.id));

    // Check if any requested seat is already taken or booked
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

    // Calculate total price for hold summary
    const totalPriceUSD = requestedSeats.reduce((sum, s) => sum + s.priceUSD, 0);

    // Update mock server state: selected -> held
    updateMockSeatStatuses(request.showId, request.seatIds, 'held');

    const expiresInSeconds = 600; // 10 minutes hold
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

  return apiClient.request<HoldResponse>('/holds', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

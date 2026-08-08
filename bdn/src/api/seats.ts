import { apiClient } from './client';
import { SeatMapData, Seat, ShowDetails, SeatTier } from '../types/seat';
import { MOCK_SHOWTIMES, MOCK_MOVIES } from './mockData';

// In-memory store for mock mode seat state persistence per showtime
const mockSeatStore: Record<string, SeatMapData> = {};

function generateMockSeatMap(showId: string): SeatMapData {
  if (mockSeatStore[showId]) {
    return mockSeatStore[showId];
  }

  const showtime = MOCK_SHOWTIMES.find((s) => s.id === showId) || MOCK_SHOWTIMES[0];
  const movie = MOCK_MOVIES.find((m) => m.id === showtime.movieId) || MOCK_MOVIES[0];

  const rows = ['A', 'B', 'C', 'D', 'E', 'F'];
  const seatsPerRow = 12;
  const aisleAfterNumber = [3, 9];
  const totalSeats = rows.length * seatsPerRow; // 72 total seats

  const show: ShowDetails = {
    id: showtime.id,
    movieId: movie.id,
    movieTitle: movie.title,
    moviePosterUrl: movie.posterUrl,
    durationMinutes: movie.durationMinutes,
    genre: movie.genres.join(' / '),
    hallName: showtime.hallName,
    format: showtime.format,
    startTime: showtime.startTime,
    date: showtime.date,
    screenInfo: showtime.format,
    basePriceUSD: showtime.priceUSD,
  };

  const seats: Seat[] = [];
  const targetAvailableCount = Math.min(totalSeats, Math.max(0, showtime.availableSeatsCount));
  const targetBookedCount = totalSeats - targetAvailableCount;

  // Deterministically select exact indices to mark as booked based on showtime ID hash
  const allIndices = Array.from({ length: totalSeats }, (_, i) => i);
  let hash = 0;
  for (let i = 0; i < showId.length; i++) {
    hash = (hash << 5) - hash + showId.charCodeAt(i);
    hash |= 0;
  }

  let seed = Math.abs(hash) || 12345;
  for (let i = allIndices.length - 1; i > 0; i--) {
    seed = (seed * 9301 + 49297) % 233280;
    const j = Math.floor((seed / 233280) * (i + 1));
    const temp = allIndices[i];
    allIndices[i] = allIndices[j];
    allIndices[j] = temp;
  }

  const bookedIndices = new Set<number>(allIndices.slice(0, targetBookedCount));

  let globalIndex = 0;
  rows.forEach((row) => {
    let tier: SeatTier = 'standard';
    let tierExtra = 0;

    if (row === 'C' || row === 'D') {
      tier = 'premium';
      tierExtra = 100;
    } else if (row === 'E' || row === 'F') {
      tier = 'vip';
      tierExtra = 200;
    }

    for (let num = 1; num <= seatsPerRow; num++) {
      const seatId = `${showId}-${row}${num}`;
      const isBooked = bookedIndices.has(globalIndex);

      seats.push({
        id: seatId,
        row,
        number: num,
        tier,
        priceUSD: Number((showtime.priceUSD + tierExtra).toFixed(2)),
        status: isBooked ? 'booked' : 'available',
      });

      globalIndex++;
    }
  });

  const seatMapData: SeatMapData = {
    show,
    rows,
    seatsPerRow,
    aisleAfterNumber,
    seats,
  };

  // Ensure showtime.availableSeatsCount matches the actual generated count
  const actualAvailable = seats.filter((s) => s.status === 'available').length;
  showtime.availableSeatsCount = actualAvailable;

  mockSeatStore[showId] = seatMapData;
  return seatMapData;
}

export function updateMockSeatStatuses(
  showId: string,
  seatIds: string[],
  newStatus: 'held' | 'booked' | 'available'
) {
  if (!mockSeatStore[showId]) {
    generateMockSeatMap(showId);
  }

  const mapData = mockSeatStore[showId];
  mapData.seats = mapData.seats.map((seat) => {
    if (seatIds.includes(seat.id)) {
      return { ...seat, status: newStatus };
    }
    return seat;
  });

  // Keep availableSeatsCount in showtime and map data synchronized
  const actualAvailable = mapData.seats.filter((s) => s.status === 'available').length;
  const showtime = MOCK_SHOWTIMES.find((s) => s.id === showId);
  if (showtime) {
    showtime.availableSeatsCount = actualAvailable;
  }
}

/**
 * GET /shows/{showId}/seats
 */
export async function getSeats(showId: string): Promise<SeatMapData> {
  if (!apiClient.isMockMode) {
    try {
      return await apiClient.request<SeatMapData>(`/shows/${showId}/seats`);
    } catch (err) {
      console.warn('Backend API unavailable, serving mock seats:', err);
    }
  }

  await apiClient.simulateLatency(300);
  return generateMockSeatMap(showId);
}

// Backward compatibility alias
export const fetchSeatsByShowId = getSeats;

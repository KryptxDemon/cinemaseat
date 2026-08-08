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
    screenInfo: `${showtime.format} • 4K Laser Projection • Dolby Atmos`,
    basePriceUSD: showtime.priceUSD,
  };

  const seats: Seat[] = [];

  rows.forEach((row) => {
    let tier: SeatTier = 'standard';
    let tierExtra = 0;

    if (row === 'C' || row === 'D') {
      tier = 'premium';
      tierExtra = 2.5;
    } else if (row === 'E' || row === 'F') {
      tier = 'vip';
      tierExtra = 5.0;
    }

    for (let num = 1; num <= seatsPerRow; num++) {
      const seatId = `${showId}-${row}${num}`;

      let status: 'available' | 'booked' | 'held' = 'available';

      // Example pre-booked seats for realistic layout
      if (
        (row === 'C' && (num === 6 || num === 7)) ||
        (row === 'D' && (num === 5 || num === 6 || num === 7 || num === 8)) ||
        (row === 'B' && num === 3)
      ) {
        status = 'booked';
      }

      // Example pre-held seats
      if ((row === 'E' && num === 6) || (row === 'A' && num === 11)) {
        status = 'held';
      }

      seats.push({
        id: seatId,
        row,
        number: num,
        tier,
        priceUSD: Number((showtime.priceUSD + tierExtra).toFixed(2)),
        status,
      });
    }
  });

  const seatMapData: SeatMapData = {
    show,
    rows,
    seatsPerRow,
    aisleAfterNumber,
    seats,
  };

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

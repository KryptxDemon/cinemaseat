import { apiClient } from './client';
import { Showtime } from '../types/showtime';
import { MOCK_SHOWTIMES } from './mockData';

export async function fetchShowtimes(movieId?: string, date?: string): Promise<Showtime[]> {
  if (apiClient.isMockMode) {
    await apiClient.simulateLatency(250);
    let results = [...MOCK_SHOWTIMES];

    if (movieId) {
      results = results.filter((st) => st.movieId === movieId);
    }

    if (date) {
      results = results.filter((st) => st.date === date);
    }

    return results;
  }

  const queryParams = new URLSearchParams();
  if (movieId) queryParams.set('movie_id', movieId);
  if (date) queryParams.set('date', date);

  const url = `/showtimes${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return apiClient.request<Showtime[]>(url);
}

export async function fetchShowtimesByMovieId(movieId: string, date?: string): Promise<Showtime[]> {
  return fetchShowtimes(movieId, date);
}

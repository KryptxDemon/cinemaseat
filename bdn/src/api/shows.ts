import { apiClient } from './client';
import { Showtime } from '../types/showtime';
import { MOCK_SHOWTIMES } from './mockData';

export async function getShows(movieId?: string, date?: string): Promise<Showtime[]> {
  if (!apiClient.isMockMode) {
    try {
      const queryParams = new URLSearchParams();
      if (movieId) queryParams.set('movie_id', movieId);
      if (date) queryParams.set('date', date);

      const url = `/shows${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      return await apiClient.request<Showtime[]>(url);
    } catch (err) {
      console.warn('Backend API unavailable, serving mock shows:', err);
    }
  }

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

export async function getShowById(showId: string): Promise<Showtime | null> {
  if (!apiClient.isMockMode) {
    try {
      return await apiClient.request<Showtime>(`/shows/${showId}`);
    } catch (err) {
      console.warn('Backend API unavailable, serving mock show by id:', err);
    }
  }

  await apiClient.simulateLatency(200);
  const showtime = MOCK_SHOWTIMES.find((s) => s.id === showId);
  return showtime || null;
}

// Backward compatibility aliases
export const fetchShowtimes = getShows;
export const fetchShowtimesByMovieId = (movieId: string, date?: string) => getShows(movieId, date);

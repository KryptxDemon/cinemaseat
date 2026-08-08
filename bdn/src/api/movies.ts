import { apiClient } from './client';
import { Movie } from '../types/movie';
import { MOCK_MOVIES } from './mockData';

export async function fetchMovies(params?: { genre?: string; search?: string }): Promise<Movie[]> {
  if (apiClient.isMockMode) {
    await apiClient.simulateLatency(250);
    let results = [...MOCK_MOVIES];

    if (params?.genre && params.genre !== 'All') {
      results = results.filter((m) => m.genres.includes(params.genre as any));
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      results = results.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.director.toLowerCase().includes(q) ||
          m.synopsis.toLowerCase().includes(q)
      );
    }

    return results;
  }

  const queryParams = new URLSearchParams();
  if (params?.genre) queryParams.set('genre', params.genre);
  if (params?.search) queryParams.set('search', params.search);

  const url = `/movies${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  return apiClient.request<Movie[]>(url);
}

export async function fetchMovieById(id: string): Promise<Movie | null> {
  if (apiClient.isMockMode) {
    await apiClient.simulateLatency(200);
    const movie = MOCK_MOVIES.find((m) => m.id === id);
    return movie || null;
  }

  try {
    return await apiClient.request<Movie>(`/movies/${id}`);
  } catch (err) {
    return null;
  }
}

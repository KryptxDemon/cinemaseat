/// <reference types="vite/client" />
import { ApiError } from '../types/api';

/**
 * CinemaSeat API Client (Configured for FastAPI backend)
 * 
 * Target REST Contract:
 * Base URL: import.meta.env.VITE_API_URL || ''
 * Headers: Content-Type: application/json
 */

export const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || '';

export class HttpClient {
  private baseUrl: string;
  public isMockMode: boolean;
  private authToken: string | null = null;

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl;
    // Client-side execution mode
    this.isMockMode = true;
  }

  /**
   * Set or clear the current authentication Bearer token
   */
  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  /**
   * Get the active authentication Bearer token
   */
  getAuthToken(): string | null {
    return this.authToken;
  }

  /**
   * Generic fetch wrapper handling headers, JSON serialization, auth token attachment, and status codes.
   */
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    // Attach Bearer authentication token if present and not explicitly overridden
    if (this.authToken && !headers['Authorization'] && !headers['authorization']) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        let errorData: unknown;
        try {
          errorData = await response.json();
        } catch {
          errorData = await response.text();
        }

        const apiError: ApiError = {
          statusCode: response.status,
          message:
            (errorData as { detail?: string; message?: string })?.detail ||
            (errorData as { message?: string })?.message ||
            `API Request failed with status ${response.status}`,
          details: typeof errorData === 'object' ? (errorData as Record<string, unknown>) : { body: errorData },
        };

        throw apiError;
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      if ((err as ApiError).statusCode !== undefined) {
        throw err;
      }
      
      const networkError: ApiError = {
        statusCode: 0,
        message: 'Unable to connect to CinemaSeat API backend.',
        details: (err as Error).message,
      };
      throw networkError;
    }
  }

  /**
   * Helper to simulate network latency for mock mode
   */
  async simulateLatency(ms: number = 250): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const apiClient = new HttpClient();

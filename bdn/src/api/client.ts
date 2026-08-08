/// <reference types="vite/client" />
import { ApiError } from '../types/api';


/**
 * CinemaSeat API Client (Configured for FastAPI backend)
 * 
 * Target REST Contract:
 * Base URL: process.env.VITE_API_URL || '/api/v1'
 * Headers: Content-Type: application/json
 */

export const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || '/api/v1';

export class HttpClient {
  private baseUrl: string;
  public isMockMode: boolean;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    // Auto-detect mock fallback if backend is not configured
    this.isMockMode = !import.meta.env.VITE_API_URL;
  }

  /**
   * Generic fetch wrapper handling headers, JSON serialization, and status codes.
   */
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

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
          message: (errorData as { detail?: string })?.detail || `API Request failed with status ${response.status}`,
          details: errorData as Record<string, unknown>,
        };

        throw apiError;
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      if ((err as ApiError).statusCode) {
        throw err;
      }
      
      // Network or connectivity error
      const networkError: ApiError = {
        statusCode: 0,
        message: 'Unable to connect to CinemaSeat API backend.',
        details: (err as Error).message,
      };
      throw networkError;
    }
  }

  /**
   * Helper to simulate network latency for mock mode during design evaluation
   */
  async simulateLatency(ms: number = 300): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const apiClient = new HttpClient();

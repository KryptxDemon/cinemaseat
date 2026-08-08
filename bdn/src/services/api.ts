/**
 * Centralized API client for the CinemaSeat frontend.
 *
 * Base URL comes from VITE_API_URL (e.g. http://localhost:8000).
 * If the env var is unset, relative URLs are used (same-origin).
 *
 * This module is the ONLY place the frontend talks to FastAPI.
 * Services wrap these helpers to expose typed business operations.
 */

export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ?? '';

export interface ApiError extends Error {
  statusCode: number;
  details?: unknown;
}

function buildError(statusCode: number, message: string, details?: unknown): ApiError {
  const err = new Error(message) as ApiError;
  err.statusCode = statusCode;
  err.details = details;
  return err;
}

async function parseError(response: Response): Promise<ApiError> {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    try {
      payload = await response.text();
    } catch {
      payload = null;
    }
  }

  const messageFromPayload =
    (payload &&
      typeof payload === 'object' &&
      ('detail' in (payload as Record<string, unknown>) &&
        typeof (payload as { detail?: unknown }).detail === 'string'
        ? (payload as { detail: string }).detail
        : 'message' in (payload as Record<string, unknown>) &&
          typeof (payload as { message?: unknown }).message === 'string'
        ? (payload as { message: string }).message
        : null)) ||
    (typeof payload === 'string' && payload ? payload : null) ||
    `Request failed with status ${response.status}`;

  return buildError(response.status, messageFromPayload, payload);
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body,
      signal: options.signal,
    });
  } catch (err) {
    throw buildError(0, 'Unable to connect to the CinemaSeat backend.', err);
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  // 204 / empty
  const text = await response.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

/**
 * Fetch a binary response (e.g. PDF ticket) and return it as a Blob.
 */
export async function apiRequestBlob(
  path: string,
  options: RequestOptions = {}
): Promise<Blob> {
  const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    Accept: 'application/pdf, application/octet-stream, */*',
    ...(options.headers || {}),
  };

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body,
      signal: options.signal,
    });
  } catch (err) {
    throw buildError(0, 'Unable to connect to the CinemaSeat backend.', err);
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  return response.blob();
}

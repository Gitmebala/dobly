import { getSupabase } from './supabase';

type ApiOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  timeoutMs?: number;
};

function getApiBaseUrl() {
  const value = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
  if (!value) {
    throw new Error('EXPO_PUBLIC_API_URL is not configured.');
  }

  const url = new URL(value);
  const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol !== 'https:' && !(isLocal && __DEV__)) {
    throw new Error('EXPO_PUBLIC_API_URL must use HTTPS.');
  }
  return url.toString().replace(/\/$/, '');
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  if (!path.startsWith('/api/')) throw new Error('Mobile API paths must start with /api/.');

  const { data, error } = await getSupabase().auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error('Your session has expired. Sign in again.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 20_000);

  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${data.session.access_token}`,
        ...options.headers,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload && typeof payload.error === 'string'
        ? payload.error
        : `Dobly request failed (${response.status}).`;
      throw new Error(message);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Dobly took too long to respond. Try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function apiUpload<T>(path: string, body: FormData, timeoutMs = 45_000): Promise<T> {
  if (!path.startsWith('/api/')) throw new Error('Mobile API paths must start with /api/.');

  const { data, error } = await getSupabase().auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error('Your session has expired. Sign in again.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${data.session.access_token}`,
      },
      body,
      signal: controller.signal,
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload && typeof payload.error === 'string'
        ? payload.error
        : `Dobly request failed (${response.status}).`);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('The upload took too long. Try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

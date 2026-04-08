import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { getAuthHeader } from '@/hooks/auth/token-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
const CACHE_DURATION_MS = 5 * 60 * 1000;
const DEBOUNCE_MS = 300;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

type CacheEntry = {
  data: unknown;
  timestamp: number;
  expiry: number;
};

const requestCache = new Map<string, CacheEntry>();

export type UseGetRequestOptions<T> = {
  url: string;
  method?: HttpMethod;
  params?: Record<string, string | number | boolean | null | undefined>;
  data?: unknown;
  headers?: Record<string, string>;
  requireAuth?: boolean;
  cacheDurationMs?: number;
  debounceMs?: number;
  enabled?: boolean;
  dependencies?: unknown[];
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
};

export type UseGetRequestResult<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
};

function toQueryString(params?: Record<string, string | number | boolean | null | undefined>) {
  if (!params) return '';
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null);
  if (entries.length === 0) return '';

  return entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}

function toAbsoluteUrl(url: string, params?: Record<string, string | number | boolean | null | undefined>) {
  const base = url.startsWith('http://') || url.startsWith('https://')
    ? url
    : `${API_BASE_URL.replace(/\/+$/, '')}/api/query/attendance/${url.replace(/^\/+/, '')}`;

  const query = toQueryString(params);
  return query ? `${base}${base.includes('?') ? '&' : '?'}${query}` : base;
}

export function useGetRequest<T>({
  url,
  method = 'GET',
  params,
  data: requestData,
  headers: requestHeaders,
  requireAuth = true,
  cacheDurationMs = CACHE_DURATION_MS,
  debounceMs = DEBOUNCE_MS,
  enabled = true,
  dependencies = [],
  onSuccess,
  onError,
}: UseGetRequestOptions<T>): UseGetRequestResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<Error | null>(null);

  const requestUrl = useMemo(() => toAbsoluteUrl(url, params), [url, JSON.stringify(params)]);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cacheKey = useMemo(() => `${method}:${requestUrl}:body:${JSON.stringify(requestData ?? null)}:auth:${requireAuth ? '1' : '0'}`, [
    method,
    requestUrl,
    requestData,
    requireAuth,
  ]);

  const fetchData = useCallback(
    async (forceFetch = false) => {
      if (!enabled) return;
      if (!requestUrl || (!url.startsWith('http') && !API_BASE_URL)) {
        const missingBaseUrlError = new Error(
          'Missing API base URL. Set EXPO_PUBLIC_API_BASE_URL or pass absolute URL.'
        );
        setError(missingBaseUrlError);
        onError?.(missingBaseUrlError);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const cached = requestCache.get(cacheKey);
        if (!forceFetch && cached && Date.now() - cached.timestamp < cached.expiry) {
          const cachedData = cached.data as T;
          setData(cachedData);
          onSuccess?.(cachedData);
          return;
        }

        const headers: Record<string, string> = {
          Accept: 'application/json',
          ...(method === 'GET' ? {} : { 'Content-Type': 'application/json' }),
          ...(requestHeaders ?? {}),
        };

        if (requireAuth) {
          const authHeader = await getAuthHeader();
          if (!authHeader) throw new Error('No access token available');
          if (__DEV__) {
            console.log('[useGetRequest] auth header:', authHeader);
          }
          headers.Authorization = authHeader;
        }

        const response = await fetch(requestUrl, {
          method,
          headers,
          body: method === 'GET' ? undefined : JSON.stringify(requestData ?? {}),
        });

        if (response.status === 401 && Platform.OS === 'web' && typeof window !== 'undefined') {
          window.location.assign('/login');
          return;
        }

        if (!response.ok) {
          throw new Error(`${method} ${requestUrl} failed with status ${response.status}`);
        }

        const responseData = (await response.json()) as T;
        requestCache.set(cacheKey, { data: responseData, timestamp: Date.now(), expiry: cacheDurationMs });
        setData(responseData);
        onSuccess?.(responseData);
      } catch (err) {
        const fetchError = err instanceof Error ? err : new Error('Request failed');
        setError(fetchError);
        onError?.(fetchError);
      } finally {
        setLoading(false);
      }
    },
    [enabled, requestUrl, url, method, requestData, requestHeaders, cacheKey, cacheDurationMs, requireAuth, onSuccess, onError]
  );

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      void fetchData(false);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [fetchData, debounceMs, enabled, ...dependencies]);

  return {
    data,
    loading,
    error,
    refetch: async () => {
      await fetchData(true);
    },
  };
}

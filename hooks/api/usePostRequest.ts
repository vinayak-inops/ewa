import { useState } from 'react';
import { Platform } from 'react-native';

import { getAuthHeader } from '@/hooks/auth/token-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

function getLoginRedirectUrl() {
  const baseUrl = (process.env.EXPO_PUBLIC_NEXTAUTH_URL ?? '').trim();
  if (baseUrl) {
    return `${baseUrl.replace(/\/+$/, '')}/login`;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/login`;
  }

  return '/login';
}

type SupportedFile = File | Blob;

export type UsePostRequestOptions<T> = {
  url: string;
  data?: Record<string, unknown> | unknown;
  salMonth?: string;
  files?: SupportedFile | SupportedFile[];
  headers?: Record<string, string>;
  requireAuth?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
};

export type UsePostRequestResult<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
  uploadProgress: number;
  post: (postData?: Record<string, unknown> | unknown) => Promise<void>;
};

function toAbsoluteUrl(url: string) {
  return url.startsWith('http://') || url.startsWith('https://')
    ? url
    : `${API_BASE_URL}/api/command/attendance/${url}`;
}

function appendFormValue(formData: FormData, key: string, value: unknown) {
  if (value === undefined || value === null) return;

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    formData.append(key, String(value));
    return;
  }

  formData.append(key, JSON.stringify(value));
}

export function usePostRequest<T>({
  url,
  data: initialData,
  salMonth,
  files,
  headers = {},
  requireAuth = true,
  onSuccess,
  onError,
  onProgress,
}: UsePostRequestOptions<T>): UsePostRequestResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const post = async (postData?: Record<string, unknown> | unknown) => {
    const requestUrl = toAbsoluteUrl(url);

    if (!requestUrl || (!url.startsWith('http') && !API_BASE_URL)) {
      const missingBaseUrlError = new Error(
        'Missing API base URL. Set EXPO_PUBLIC_API_BASE_URL or pass absolute URL.'
      );
      setError(missingBaseUrlError);
      onError?.(missingBaseUrlError);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setUploadProgress(0);

      const authHeader = requireAuth ? await getAuthHeader() : null;
      if (requireAuth && !authHeader) {
        throw new Error('No access token available');
      }

      const requestHeaders: Record<string, string> = {
        Accept: 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...headers,
      };

      let body: FormData | string;
      if (files) {
        const formData = new FormData();
        const normalizedFiles = Array.isArray(files) ? files : [files];

        normalizedFiles.forEach((file, index) => {
          formData.append(Array.isArray(files) ? `file${index}` : 'file', file);
        });

        const mergedData = {
          ...(initialData && typeof initialData === 'object' && !Array.isArray(initialData) ? initialData : {}),
          ...(postData && typeof postData === 'object' && !Array.isArray(postData) ? postData : {}),
          ...(salMonth ? { salMonth } : {}),
        };

        Object.entries(mergedData).forEach(([key, value]) => {
          appendFormValue(formData, key, value);
        });

        body = formData;
      } else {
        const mergedData =
          initialData && typeof initialData === 'object' && !Array.isArray(initialData)
            ? {
                ...initialData,
                ...(postData && typeof postData === 'object' && !Array.isArray(postData) ? postData : {}),
                ...(salMonth ? { salMonth } : {}),
              }
            : postData ?? initialData ?? (salMonth ? { salMonth } : {});

        requestHeaders['Content-Type'] = 'application/json';
        body = JSON.stringify(mergedData ?? {});
      }

      if (__DEV__) {
        console.log('[usePostRequest] request', {
          method: 'POST',
          url: requestUrl,
          requireAuth,
          hasFiles: Boolean(files),
          headers: requestHeaders,
        });
      }

      const responseData = await new Promise<T>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', requestUrl);

        Object.entries(requestHeaders).forEach(([key, value]) => {
          xhr.setRequestHeader(key, value);
        });

        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          const progress = Math.round((event.loaded * 100) / event.total);
          setUploadProgress(progress);
          onProgress?.(progress);
        };

        xhr.onload = () => {
          if (__DEV__) {
            console.log('[usePostRequest] response', {
              method: 'POST',
              url: requestUrl,
              status: xhr.status,
            });
          }

          if (xhr.status === 401 && Platform.OS === 'web' && typeof window !== 'undefined') {
            window.location.assign(getLoginRedirectUrl());
            resolve(null as T);
            return;
          }

          if (xhr.status < 200 || xhr.status >= 300) {
            reject(new Error(`POST ${requestUrl} failed with status ${xhr.status}`));
            return;
          }

          try {
            const parsed = xhr.responseText ? (JSON.parse(xhr.responseText) as T) : (null as T);
            setUploadProgress(100);
            onProgress?.(100);
            resolve(parsed);
          } catch {
            reject(new Error('Failed to parse response JSON'));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network request failed'));
        };

        xhr.send(body);
      });

      setData(responseData);
      onSuccess?.(responseData);
    } catch (err) {
      const postError = err instanceof Error ? err : new Error('POST request failed');
      setError(postError);
      onError?.(postError);
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    error,
    uploadProgress,
    post,
  };
}

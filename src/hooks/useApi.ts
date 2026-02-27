'use client';

import { useCallback } from 'react';
import { useAuth } from './useAuth';
import type { ApiResponse } from '@/types';

/**
 * Thin wrapper around fetch that automatically attaches the Firebase ID token.
 * Handles non-2xx responses, network errors, and non-JSON responses.
 */
export function useApi() {
  const { getToken } = useAuth();

  const apiFetch = useCallback(
    async <T>(
      url: string,
      options: RequestInit = {},
    ): Promise<ApiResponse<T>> => {
      let res: Response;
      try {
        const token = await getToken();
        res = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...options.headers,
          },
        });
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Network request failed',
        };
      }

      const contentType = res.headers.get('content-type');
      const isJson = contentType?.includes('application/json');

      if (!res.ok) {
        if (isJson) {
          try {
            const body = (await res.json()) as ApiResponse<T>;
            if (!body.success && 'error' in body) {
              return { success: false, error: body.error };
            }
          } catch {
            // fall through to generic error
          }
        }
        return {
          success: false,
          error: `Request failed: ${res.status} ${res.statusText}`,
        };
      }

      if (!isJson) {
        return {
          success: false,
          error: 'Invalid response format',
        };
      }

      try {
        return (await res.json()) as ApiResponse<T>;
      } catch {
        return { success: false, error: 'Failed to parse response' };
      }
    },
    [getToken],
  );

  return { apiFetch };
}

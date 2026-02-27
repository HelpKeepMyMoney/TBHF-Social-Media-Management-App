'use client';

import { useCallback } from 'react';
import { useAuth } from './useAuth';
import type { ApiResponse } from '@/types';

/**
 * Thin wrapper around fetch that automatically attaches the Firebase ID token.
 */
export function useApi() {
  const { getToken } = useAuth();

  const apiFetch = useCallback(
    async <T>(
      url: string,
      options: RequestInit = {},
    ): Promise<ApiResponse<T>> => {
      const token = await getToken();
      const res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...options.headers,
        },
      });
      return res.json() as Promise<ApiResponse<T>>;
    },
    [getToken],
  );

  return { apiFetch };
}

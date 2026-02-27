'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { getClientFirestore } from '@/lib/firebase/client';
import { useApi } from './useApi';
import type { Post, PostFormData, PostStatus } from '@/types';

export function usePosts(campaignId?: string, status?: PostStatus) {
  const { apiFetch } = useApi();
  const [posts, setPosts]     = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const db = getClientFirestore();
    let q = query(collection(db, 'posts'), orderBy('scheduledTime', 'asc'));

    if (campaignId) {
      q = query(q, where('campaignId', '==', campaignId));
    }
    if (status) {
      q = query(q, where('status', '==', status));
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Post[];
        setPosts(docs);
        setLoading(false);
      },
      (err) => {
        console.error('[usePosts]', err);
        setError('Failed to load posts');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [campaignId, status]);

  const createPost = useCallback(
    async (data: PostFormData) => {
      const res = await apiFetch<Post>('/api/posts', {
        method: 'POST',
        body:   JSON.stringify(data),
      });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    [apiFetch],
  );

  const updatePost = useCallback(
    async (id: string, data: Partial<PostFormData>) => {
      const res = await apiFetch<Post>(`/api/posts/${id}`, {
        method: 'PATCH',
        body:   JSON.stringify(data),
      });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    [apiFetch],
  );

  const deletePost = useCallback(
    async (id: string) => {
      const res = await apiFetch<{ deleted: boolean }>(`/api/posts/${id}`, {
        method: 'DELETE',
      });
      if (!res.success) throw new Error(res.error);
    },
    [apiFetch],
  );

  return { posts, loading, error, createPost, updatePost, deletePost };
}

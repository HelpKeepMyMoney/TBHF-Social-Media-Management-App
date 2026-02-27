'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { getClientFirestore } from '@/lib/firebase/client';
import { useApi } from './useApi';
import type { Campaign, CampaignFormData } from '@/types';

export function useCampaigns() {
  const { apiFetch } = useApi();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Real-time listener via Firestore client SDK
  useEffect(() => {
    const db = getClientFirestore();
    const q = query(
      collection(db, 'campaigns'),
      orderBy('createdAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Campaign[];
        setCampaigns(docs);
        setLoading(false);
      },
      (err) => {
        console.error('[useCampaigns]', err);
        setError('Failed to load campaigns');
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const createCampaign = useCallback(
    async (data: CampaignFormData) => {
      const res = await apiFetch<Campaign>('/api/campaigns', {
        method: 'POST',
        body:   JSON.stringify(data),
      });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    [apiFetch],
  );

  const updateCampaign = useCallback(
    async (id: string, data: Partial<CampaignFormData>) => {
      const res = await apiFetch<Campaign>(`/api/campaigns/${id}`, {
        method: 'PATCH',
        body:   JSON.stringify(data),
      });
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    [apiFetch],
  );

  const deleteCampaign = useCallback(
    async (id: string) => {
      const res = await apiFetch<{ deleted: boolean }>(`/api/campaigns/${id}`, {
        method: 'DELETE',
      });
      if (!res.success) throw new Error(res.error);
    },
    [apiFetch],
  );

  return {
    campaigns,
    loading,
    error,
    createCampaign,
    updateCampaign,
    deleteCampaign,
  };
}

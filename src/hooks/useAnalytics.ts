'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { getClientFirestore } from '@/lib/firebase/client';
import type { AnalyticsEntry, ImpactMetrics } from '@/types';

export function useAnalytics(campaignId?: string) {
  const [analytics, setAnalytics] = useState<AnalyticsEntry[]>([]);
  const [impact, setImpact]       = useState<ImpactMetrics | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const db = getClientFirestore();

        // Fetch analytics entries
        let analyticsQuery = query(
          collection(db, 'analytics'),
          orderBy('date', 'asc'),
        );
        if (campaignId) {
          analyticsQuery = query(
            analyticsQuery,
            where('campaignId', '==', campaignId),
          );
        }

        const analyticsSnap = await getDocs(analyticsQuery);
        const entries = analyticsSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as AnalyticsEntry[];
        setAnalytics(entries);

        // Fetch impact metrics
        if (campaignId) {
          const impactSnap = await getDocs(
            query(
              collection(db, 'impact_metrics'),
              where('campaignId', '==', campaignId),
            ),
          );
          if (!impactSnap.empty) {
            setImpact({ id: impactSnap.docs[0].id, ...impactSnap.docs[0].data() } as ImpactMetrics);
          }
        }
      } catch (err) {
        console.error('[useAnalytics]', err);
        setError('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [campaignId]);

  // Computed aggregates
  const totalReach      = analytics.reduce((sum, e) => sum + e.reach, 0);
  const totalEngagement = analytics.reduce((sum, e) => sum + e.engagement, 0);
  const avgEngagement   = analytics.length
    ? totalEngagement / analytics.length
    : 0;

  return {
    analytics,
    impact,
    loading,
    error,
    totalReach,
    totalEngagement,
    avgEngagement,
  };
}

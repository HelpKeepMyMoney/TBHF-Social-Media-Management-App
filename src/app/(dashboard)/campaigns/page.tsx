'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  Plus,
  Megaphone,
  Calendar,
  DollarSign,
  ArrowRight,
  Search,
} from 'lucide-react';
import type { Campaign } from '@/types';

export default function CampaignsPage() {
  const { campaigns, loading } = useCampaigns();
  const { isStaff }            = useAuth();
  const [search, setSearch]    = useState('');

  if (loading) return <PageLoader />;

  const now = new Date();

  function getCampaignStatus(c: Campaign): 'active' | 'upcoming' | 'ended' {
    const start = new Date(c.startDate);
    const end   = new Date(c.endDate);
    if (now < start) return 'upcoming';
    if (now > end)   return 'ended';
    return 'active';
  }

  const filtered = campaigns.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search campaigns…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-9"
          />
        </div>
        {isStaff && (
          <Link href="/campaigns/new">
            <Button icon={<Plus className="h-4 w-4" />}>New Campaign</Button>
          </Link>
        )}
      </div>

      {/* Campaign grid */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Megaphone className="h-10 w-10 text-stone-300 mx-auto mb-3" />
          <h3 className="font-semibold text-stone-700">No campaigns found</h3>
          <p className="text-sm text-stone-400 mt-1">
            {search ? 'Try a different search term.' : 'Create your first campaign to get started.'}
          </p>
          {isStaff && !search && (
            <Link href="/campaigns/new" className="mt-4 inline-block">
              <Button>Create campaign</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const status = getCampaignStatus(c);
            return (
              <Link key={c.id} href={`/campaigns/${c.id}`}>
                <div className="card hover:shadow-card-hover transition-shadow cursor-pointer h-full flex flex-col">
                  {/* Card header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <h3 className="font-semibold text-stone-900 leading-tight">{c.name}</h3>
                    <Badge
                      variant={
                        status === 'active'   ? 'success'
                        : status === 'upcoming' ? 'warning'
                        : 'neutral'
                      }
                    >
                      {status}
                    </Badge>
                  </div>

                  <p className="text-sm text-stone-500 line-clamp-2 flex-1">{c.description}</p>

                  {c.hashtag && (
                    <p className="text-xs text-brand-600 font-medium mt-2">{c.hashtag}</p>
                  )}

                  {/* Meta */}
                  <div className="mt-4 pt-4 border-t border-stone-100 grid grid-cols-2 gap-3 text-xs text-stone-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDate(c.startDate, 'MMM d')} – {formatDate(c.endDate, 'MMM d')}</span>
                    </div>
                    {c.fundraisingGoal > 0 && (
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5" />
                        <span>Goal: {formatCurrency(c.fundraisingGoal)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center text-brand-600 text-xs font-medium mt-3 gap-1">
                    View campaign <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

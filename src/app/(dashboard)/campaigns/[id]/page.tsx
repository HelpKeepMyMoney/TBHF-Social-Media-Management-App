'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCampaigns } from '@/hooks/useCampaigns';
import { usePosts } from '@/hooks/usePosts';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { MetricCard } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import {
  formatDate,
  formatCurrency,
  formatNumber,
  PLATFORM_LABELS,
  STATUS_COLORS,
  truncate,
} from '@/lib/utils';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  BarChart2,
  FileText,
  Wand2,
  Calendar,
} from 'lucide-react';
import type { Campaign } from '@/types';

export default function CampaignDetailPage() {
  const params                        = useParams<{ id: string }>();
  const router                        = useRouter();
  const { campaigns, loading: campLoad, deleteCampaign } = useCampaigns();
  const { posts, loading: postsLoad } = usePosts(params.id);
  const { analytics, totalReach, avgEngagement } = useAnalytics(params.id);
  const { isAdmin, isStaff }          = useAuth();
  const toast                         = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]           = useState(false);

  const campaign = campaigns.find((c) => c.id === params.id) as Campaign | undefined;
  const loading  = campLoad || postsLoad;

  if (loading) return <PageLoader />;

  if (!campaign) {
    return (
      <div className="text-center py-20">
        <p className="text-stone-500">Campaign not found.</p>
        <Link href="/campaigns" className="text-brand-600 hover:underline text-sm mt-2 inline-block">
          Back to campaigns
        </Link>
      </div>
    );
  }

  const now    = new Date();
  const status = now < new Date(campaign.startDate) ? 'upcoming'
               : now > new Date(campaign.endDate)   ? 'ended'
               : 'active';

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteCampaign(campaign!.id);
      toast('success', 'Campaign deleted');
      router.push('/campaigns');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to delete');
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb + actions */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/campaigns" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-2">
            <ArrowLeft className="h-3.5 w-3.5" /> Campaigns
          </Link>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-stone-900">{campaign.name}</h2>
            <Badge
              variant={status === 'active' ? 'success' : status === 'upcoming' ? 'warning' : 'neutral'}
            >
              {status}
            </Badge>
          </div>
        </div>
        {isStaff && (
          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/campaigns/${campaign.id}/edit`}>
              <Button variant="secondary" icon={<Edit className="h-3.5 w-3.5" />} size="sm">
                Edit
              </Button>
            </Link>
            {isAdmin && (
              <Button
                variant="danger"
                icon={<Trash2 className="h-3.5 w-3.5" />}
                size="sm"
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Campaign info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-5 space-y-4">
          <div>
            <h3 className="section-heading mb-1">Key Message</h3>
            <p className="text-stone-600 text-sm">{campaign.keyMessage || '—'}</p>
          </div>
          <div>
            <h3 className="section-heading mb-1">Description</h3>
            <p className="text-stone-600 text-sm">{campaign.description || '—'}</p>
          </div>
          {campaign.hashtag && (
            <div>
              <h3 className="section-heading mb-1">Hashtag</h3>
              <p className="text-brand-600 font-medium text-sm">{campaign.hashtag}</p>
            </div>
          )}
        </div>

        <div className="card p-5 space-y-4 text-sm">
          <div className="flex items-center gap-2 text-stone-600">
            <Calendar className="h-4 w-4 text-stone-400" />
            <span>{formatDate(campaign.startDate)} – {formatDate(campaign.endDate)}</span>
          </div>
          {campaign.fundraisingGoal > 0 && (
            <div>
              <p className="text-stone-400 text-xs">Fundraising Goal</p>
              <p className="font-semibold text-stone-800">{formatCurrency(campaign.fundraisingGoal)}</p>
            </div>
          )}
          {campaign.awarenessGoal && (
            <div>
              <p className="text-stone-400 text-xs">Awareness Goal</p>
              <p className="font-semibold text-stone-800">{campaign.awarenessGoal}</p>
            </div>
          )}
          <div>
            <p className="text-stone-400 text-xs">Created</p>
            <p className="text-stone-600">{formatDate(campaign.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Posts"        value={posts.length}                icon={<FileText  className="h-5 w-5" />} />
        <MetricCard label="Scheduled"          value={posts.filter(p => p.status === 'scheduled').length} icon={<Calendar  className="h-5 w-5" />} />
        <MetricCard label="Total Reach"        value={formatNumber(totalReach)}    icon={<BarChart2 className="h-5 w-5" />} />
        <MetricCard label="Avg. Engagement"    value={formatNumber(avgEngagement)} icon={<Wand2     className="h-5 w-5" />} />
      </div>

      {/* Posts for this campaign */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-heading">Posts ({posts.length})</h3>
          {isStaff && (
            <Link href={`/posts/new?campaignId=${campaign.id}`}>
              <Button size="sm" icon={<Plus className="h-3.5 w-3.5" />}>New Post</Button>
            </Link>
          )}
        </div>
        {posts.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-8">No posts yet for this campaign.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="text-left font-medium text-stone-500 pb-2 pr-4">Caption</th>
                  <th className="text-left font-medium text-stone-500 pb-2 pr-4">Platform</th>
                  <th className="text-left font-medium text-stone-500 pb-2 pr-4">Status</th>
                  <th className="text-left font-medium text-stone-500 pb-2">Scheduled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {posts.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50/50">
                    <td className="py-2.5 pr-4 text-stone-700">{truncate(p.caption, 60)}</td>
                    <td className="py-2.5 pr-4 text-stone-600 capitalize">{PLATFORM_LABELS[p.platform]}</td>
                    <td className="py-2.5 pr-4">
                      <Badge
                        variant={p.status === 'posted' ? 'success' : p.status === 'scheduled' ? 'warning' : 'neutral'}
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-stone-500">
                      {p.scheduledTime ? formatDate(p.scheduledTime, 'MMM d, h:mm a') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete Campaign"
        size="sm"
      >
        <p className="text-sm text-stone-600 mb-5">
          Are you sure you want to delete <strong>{campaign.name}</strong>? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="danger" loading={deleting} onClick={handleDelete}>
            Delete Campaign
          </Button>
          <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}

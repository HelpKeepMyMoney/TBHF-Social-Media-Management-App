'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePosts } from '@/hooks/usePosts';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import {
  formatDateTime,
  PLATFORM_LABELS,
  truncate,
  cn,
} from '@/lib/utils';
import {
  Plus,
  Pencil,
  Trash2,
  Filter,
  FileText,
  Image as ImageIcon,
  Video,
} from 'lucide-react';
import type { Post, PostStatus, Platform } from '@/types';

const STATUS_OPTIONS: Array<{ value: PostStatus | 'all'; label: string }> = [
  { value: 'all',       label: 'All' },
  { value: 'draft',     label: 'Draft' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'posted',    label: 'Posted' },
];

export default function PostsPage() {
  const { posts, loading, deletePost } = usePosts();
  const { campaigns }                  = useCampaigns();
  const { isStaff }                    = useAuth();
  const toast                          = useToast();
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>('all');
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all');
  const [deletingId, setDeletingId]    = useState<string | null>(null);
  const [confirmPost, setConfirmPost]  = useState<Post | null>(null);

  if (loading) return <PageLoader />;

  const filtered = posts.filter((p) => {
    if (statusFilter   !== 'all' && p.status   !== statusFilter)   return false;
    if (platformFilter !== 'all' && p.platform !== platformFilter) return false;
    return true;
  });

  function getCampaignName(id: string) {
    return campaigns.find((c) => c.id === id)?.name ?? '—';
  }

  async function handleDelete(post: Post) {
    setDeletingId(post.id);
    try {
      await deletePost(post.id);
      toast('success', 'Post deleted');
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingId(null);
      setConfirmPost(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-stone-400" />
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={cn(
                'text-xs px-3 py-1.5 rounded-full font-medium transition-colors',
                statusFilter === opt.value
                  ? 'bg-brand-500 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200',
              )}
            >
              {opt.label}
            </button>
          ))}
          <div className="w-px h-4 bg-stone-200" />
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value as Platform | 'all')}
            className="text-xs rounded-full border border-stone-200 px-3 py-1.5 text-stone-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">All Platforms</option>
            {Object.entries(PLATFORM_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {isStaff && (
          <Link href="/posts/new">
            <Button icon={<Plus className="h-4 w-4" />}>New Post</Button>
          </Link>
        )}
      </div>

      {/* Posts list */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="h-10 w-10 text-stone-300 mx-auto mb-3" />
          <h3 className="font-semibold text-stone-700">No posts found</h3>
          <p className="text-sm text-stone-400 mt-1">
            {isStaff ? 'Create your first post or adjust the filters.' : 'No posts match the current filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((post) => (
            <div key={post.id} className="card p-4 flex items-start gap-4">
              {/* Media preview */}
              {post.mediaUrl && post.mediaType === 'image' ? (
                <a
                  href={post.mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative w-16 h-16 rounded-lg overflow-hidden bg-stone-100 shrink-0 block cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <Image src={post.mediaUrl} alt="" fill className="object-cover" sizes="64px" />
                </a>
              ) : post.mediaUrl && post.mediaType === 'video' ? (
                <a
                  href={post.mediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-16 h-16 rounded-lg bg-stone-800 flex items-center justify-center shrink-0 cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <Video className="h-6 w-6 text-stone-300" />
                </a>
              ) : (
                <div className="w-16 h-16 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                  <ImageIcon className="h-6 w-6 text-stone-300" />
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">
                      {truncate(post.caption, 80)}
                    </p>
                    <p className="text-xs text-stone-400 mt-0.5">{getCampaignName(post.campaignId)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={
                      post.status === 'posted'    ? 'success'
                      : post.status === 'scheduled' ? 'warning'
                      : 'neutral'
                    }>
                      {post.status}
                    </Badge>
                    <span className="text-xs text-stone-500 capitalize">
                      {PLATFORM_LABELS[post.platform]}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-stone-400">
                    {post.scheduledTime
                      ? `Scheduled: ${formatDateTime(post.scheduledTime)}`
                      : 'Not scheduled'}
                  </p>
                  {isStaff && (
                    <div className="flex items-center gap-1">
                      <Link href={`/posts/${post.id}/edit`}>
                        <button className="btn-ghost p-1.5">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </Link>
                      <button
                        className="btn-ghost p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setConfirmPost(post)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      <Modal
        open={!!confirmPost}
        onClose={() => setConfirmPost(null)}
        title="Delete Post"
        size="sm"
      >
        <p className="text-sm text-stone-600 mb-5">
          Are you sure you want to delete this post? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button
            variant="danger"
            loading={deletingId === confirmPost?.id}
            onClick={() => confirmPost && handleDelete(confirmPost)}
          >
            Delete
          </Button>
          <Button variant="secondary" onClick={() => setConfirmPost(null)}>Cancel</Button>
        </div>
      </Modal>
    </div>
  );
}

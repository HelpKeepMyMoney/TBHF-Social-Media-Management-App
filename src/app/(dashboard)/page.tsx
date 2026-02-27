'use client';

import { useCampaigns } from '@/hooks/useCampaigns';
import { usePosts } from '@/hooks/usePosts';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useAuth } from '@/hooks/useAuth';
import { MetricCard } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import {
  formatDate,
  formatNumber,
  PLATFORM_LABELS,
  STATUS_COLORS,
  truncate,
} from '@/lib/utils';
import {
  Megaphone,
  FileText,
  BarChart2,
  Wand2,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function OverviewPage() {
  const { user } = useAuth();
  const { campaigns, loading: campLoading } = useCampaigns();
  const { posts, loading: postsLoading }    = usePosts();
  const { analytics, loading: analyticsLoading } = useAnalytics();

  const loading = campLoading || postsLoading || analyticsLoading;

  if (loading) return <PageLoader />;

  const activeCampaigns    = campaigns.filter((c) => new Date(c.endDate) >= new Date());
  const scheduledPosts     = posts.filter((p) => p.status === 'scheduled');
  const recentPosts        = posts.slice(0, 5);
  const totalReach         = analytics.reduce((sum, a) => sum + a.reach, 0);
  const totalEngagement    = analytics.reduce((sum, a) => sum + a.engagement, 0);

  // Chart data — last 14 days of analytics
  const chartData = analytics.slice(-14).map((a) => ({
    date:       formatDate(a.date, 'MMM d'),
    Reach:      a.reach,
    Engagement: a.engagement,
  }));

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-xl font-bold text-stone-900">
          Good {getGreeting()}, {user?.name.split(' ')[0]} 👋
        </h2>
        <p className="text-stone-500 text-sm mt-0.5">
          Here&apos;s what&apos;s happening with your campaigns today.
        </p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Active Campaigns"
          value={activeCampaigns.length}
          sublabel={`${campaigns.length} total`}
          icon={<Megaphone className="h-5 w-5" />}
        />
        <MetricCard
          label="Scheduled Posts"
          value={scheduledPosts.length}
          sublabel={`${posts.length} total posts`}
          icon={<FileText className="h-5 w-5" />}
        />
        <MetricCard
          label="Total Reach"
          value={formatNumber(totalReach)}
          sublabel="All campaigns"
          icon={<BarChart2 className="h-5 w-5" />}
        />
        <MetricCard
          label="Total Engagement"
          value={formatNumber(totalEngagement)}
          sublabel="Likes + comments + shares"
          icon={<Wand2 className="h-5 w-5" />}
        />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Engagement chart */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-heading">Engagement Overview</h3>
            <Link href="/analytics" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
              View full report <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="reachGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#d97706" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="engGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#78350f" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#78350f" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#78716c' }} />
                <YAxis tick={{ fontSize: 11, fill: '#78716c' }} />
                <Tooltip
                  contentStyle={{
                    background: '#fff',
                    border: '1px solid #e7e5e4',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="Reach"      stroke="#d97706" strokeWidth={2} fill="url(#reachGrad)" />
                <Area type="monotone" dataKey="Engagement" stroke="#78350f" strokeWidth={2} fill="url(#engGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-stone-400 text-sm">
              No analytics data yet. Add entries in the Analytics section.
            </div>
          )}
        </div>

        {/* Active campaigns */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="section-heading">Active Campaigns</h3>
            <Link href="/campaigns" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
              All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {activeCampaigns.length === 0 ? (
              <p className="text-sm text-stone-400 text-center py-6">No active campaigns</p>
            ) : (
              activeCampaigns.slice(0, 5).map((c) => (
                <Link key={c.id} href={`/campaigns/${c.id}`}>
                  <div className="p-3 rounded-lg border border-stone-100 hover:border-brand-200 hover:bg-brand-50/40 transition-colors cursor-pointer">
                    <p className="text-sm font-medium text-stone-800 truncate">{c.name}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Ends {formatDate(c.endDate)}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent posts */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="section-heading">Recent Posts</h3>
          <Link href="/posts" className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {recentPosts.length === 0 ? (
          <p className="text-sm text-stone-400 text-center py-8">
            No posts yet.{' '}
            <Link href="/posts/new" className="text-brand-600 hover:underline">Create your first post →</Link>
          </p>
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
                {recentPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-stone-50/50">
                    <td className="py-2.5 pr-4 text-stone-700">{truncate(post.caption, 60)}</td>
                    <td className="py-2.5 pr-4">
                      <span className="capitalize text-stone-600">
                        {PLATFORM_LABELS[post.platform] ?? post.platform}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <Badge
                        variant={
                          post.status === 'posted'    ? 'success'
                          : post.status === 'scheduled' ? 'warning'
                          : 'neutral'
                        }
                      >
                        {post.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-stone-500">
                      {post.scheduledTime ? formatDate(post.scheduledTime, 'MMM d, h:mm a') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

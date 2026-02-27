'use client';

import { useState } from 'react';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/components/ui/Toast';
import { MetricCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { formatNumber, formatDate } from '@/lib/utils';
import {
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  BarChart2,
  Users,
  TrendingUp,
  Heart,
  Plus,
  Download,
} from 'lucide-react';
import Papa from 'papaparse';
import type { AnalyticsEntry, ImpactMetrics } from '@/types';

export default function AnalyticsPage() {
  const { campaigns, loading: campLoad } = useCampaigns();
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const { analytics, impact, loading, totalReach, avgEngagement } = useAnalytics(
    selectedCampaign || undefined,
  );
  const { apiFetch } = useApi();
  const toast        = useToast();

  // Impact entry modal
  const [showImpactModal, setShowImpactModal] = useState(false);
  const [impactForm, setImpactForm] = useState({
    donationClicks:     0,
    volunteerSignups:   0,
    eventRegistrations: 0,
    mediaMentions:      0,
  });
  const [savingImpact, setSavingImpact] = useState(false);

  // Analytics entry modal
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsForm, setAnalyticsForm] = useState({
    date:          new Date().toISOString().split('T')[0],
    reach:         0,
    engagement:    0,
    followerCount: 0,
  });
  const [savingAnalytics, setSavingAnalytics] = useState(false);

  const loading2 = campLoad || loading;

  if (campLoad) return <PageLoader />;

  const chartData = analytics.map((a) => ({
    date:          formatDate(a.date, 'MMM d'),
    Reach:         a.reach,
    Engagement:    a.engagement,
    Followers:     a.followerCount,
  }));

  const totalEngagement = analytics.reduce((s, a) => s + a.engagement, 0);
  const latestFollowers = analytics[analytics.length - 1]?.followerCount ?? 0;

  function exportCSV() {
    const csv = Papa.unparse(analytics.map((a) => ({
      date:          a.date,
      reach:         a.reach,
      engagement:    a.engagement,
      followerCount: a.followerCount,
    })));
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function saveImpact() {
    if (!selectedCampaign) { toast('error', 'Select a campaign first'); return; }
    setSavingImpact(true);
    try {
      const res = await apiFetch<ImpactMetrics>('/api/analytics', {
        method: 'PUT',
        body:   JSON.stringify({ ...impactForm, campaignId: selectedCampaign }),
      });
      if (!res.success) throw new Error(res.error);
      toast('success', 'Impact metrics saved');
      setShowImpactModal(false);
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingImpact(false);
    }
  }

  async function saveAnalytics() {
    if (!selectedCampaign) { toast('error', 'Select a campaign first'); return; }
    setSavingAnalytics(true);
    try {
      const res = await apiFetch<AnalyticsEntry>('/api/analytics', {
        method: 'POST',
        body:   JSON.stringify({ ...analyticsForm, campaignId: selectedCampaign }),
      });
      if (!res.success) throw new Error(res.error);
      toast('success', 'Analytics entry added');
      setShowAnalyticsModal(false);
    } catch (err) {
      toast('error', err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingAnalytics(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Filters + actions */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <select
          value={selectedCampaign}
          onChange={(e) => setSelectedCampaign(e.target.value)}
          className="input-base max-w-xs"
        >
          <option value="">All Campaigns</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus className="h-3.5 w-3.5" />}
            onClick={() => setShowAnalyticsModal(true)}
          >
            Add Entry
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Heart className="h-3.5 w-3.5" />}
            onClick={() => {
              if (impact) {
                setImpactForm({
                  donationClicks:     impact.donationClicks,
                  volunteerSignups:   impact.volunteerSignups,
                  eventRegistrations: impact.eventRegistrations,
                  mediaMentions:      impact.mediaMentions,
                });
              }
              setShowImpactModal(true);
            }}
          >
            Update Impact
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="h-3.5 w-3.5" />}
            onClick={exportCSV}
            disabled={analytics.length === 0}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Total Reach"         value={formatNumber(totalReach)}      icon={<BarChart2    className="h-5 w-5" />} />
        <MetricCard label="Total Engagement"    value={formatNumber(totalEngagement)} icon={<TrendingUp   className="h-5 w-5" />} />
        <MetricCard label="Latest Followers"    value={formatNumber(latestFollowers)} icon={<Users        className="h-5 w-5" />} />
        <MetricCard label="Data Points"         value={analytics.length}              icon={<BarChart2    className="h-5 w-5" />} />
      </div>

      {/* Charts */}
      {chartData.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Reach & Engagement */}
          <div className="card p-5">
            <h3 className="section-heading mb-4">Reach & Engagement Over Time</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="ag1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#d97706" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ag2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#78716c' }} />
                <YAxis tick={{ fontSize: 11, fill: '#78716c' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Legend />
                <Area type="monotone" dataKey="Reach"      stroke="#d97706" fill="url(#ag1)" strokeWidth={2} />
                <Area type="monotone" dataKey="Engagement" stroke="#16a34a" fill="url(#ag2)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Follower growth */}
          <div className="card p-5">
            <h3 className="section-heading mb-4">Follower Growth</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f4" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#78716c' }} />
                <YAxis tick={{ fontSize: 11, fill: '#78716c' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="Followers" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="card p-12 text-center">
          <BarChart2 className="h-10 w-10 text-stone-300 mx-auto mb-3" />
          <h3 className="font-semibold text-stone-700">No analytics data yet</h3>
          <p className="text-sm text-stone-400 mt-1">Click &quot;Add Entry&quot; to log your first analytics data point.</p>
        </div>
      )}

      {/* Impact funnel */}
      {impact && (
        <div className="card p-5">
          <h3 className="section-heading mb-4">Impact Funnel — Content → Engagement → Outcome</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Donation Clicks',      value: impact.donationClicks,      color: 'text-green-600' },
              { label: 'Volunteer Signups',    value: impact.volunteerSignups,    color: 'text-blue-600' },
              { label: 'Event Registrations',  value: impact.eventRegistrations,  color: 'text-purple-600' },
              { label: 'Media Mentions',       value: impact.mediaMentions,       color: 'text-orange-600' },
            ].map((item) => (
              <div key={item.label} className="text-center p-4 rounded-xl bg-stone-50">
                <p className={`text-3xl font-bold ${item.color}`}>{formatNumber(item.value)}</p>
                <p className="text-xs text-stone-500 mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add analytics modal */}
      <Modal
        open={showAnalyticsModal}
        onClose={() => setShowAnalyticsModal(false)}
        title="Add Analytics Entry"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="label block mb-1.5">Date</label>
            <input
              type="date"
              value={analyticsForm.date}
              onChange={(e) => setAnalyticsForm((f) => ({ ...f, date: e.target.value }))}
              className="input-base"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label block mb-1.5">Reach</label>
              <input type="number" min="0" value={analyticsForm.reach}
                onChange={(e) => setAnalyticsForm((f) => ({ ...f, reach: +e.target.value }))}
                className="input-base" />
            </div>
            <div>
              <label className="label block mb-1.5">Engagement</label>
              <input type="number" min="0" value={analyticsForm.engagement}
                onChange={(e) => setAnalyticsForm((f) => ({ ...f, engagement: +e.target.value }))}
                className="input-base" />
            </div>
            <div className="col-span-2">
              <label className="label block mb-1.5">Follower Count</label>
              <input type="number" min="0" value={analyticsForm.followerCount}
                onChange={(e) => setAnalyticsForm((f) => ({ ...f, followerCount: +e.target.value }))}
                className="input-base" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button loading={savingAnalytics} onClick={saveAnalytics}>Save Entry</Button>
            <Button variant="secondary" onClick={() => setShowAnalyticsModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Impact modal */}
      <Modal
        open={showImpactModal}
        onClose={() => setShowImpactModal(false)}
        title="Update Impact Metrics"
        size="sm"
      >
        <div className="space-y-4">
          {[
            { key: 'donationClicks',     label: 'Donation Link Clicks' },
            { key: 'volunteerSignups',   label: 'Volunteer Signups' },
            { key: 'eventRegistrations', label: 'Event Registrations' },
            { key: 'mediaMentions',      label: 'Media Mentions' },
          ].map((item) => (
            <div key={item.key}>
              <label className="label block mb-1.5">{item.label}</label>
              <input
                type="number"
                min="0"
                value={impactForm[item.key as keyof typeof impactForm]}
                onChange={(e) =>
                  setImpactForm((f) => ({ ...f, [item.key]: +e.target.value }))
                }
                className="input-base"
              />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <Button loading={savingImpact} onClick={saveImpact}>Save Impact</Button>
            <Button variant="secondary" onClick={() => setShowImpactModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

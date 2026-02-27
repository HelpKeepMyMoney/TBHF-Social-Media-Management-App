import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth/middleware';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { writeAuditLog } from '@/lib/utils/audit-log';
import type { Campaign, Post, AnalyticsEntry, ImpactMetrics, BoardReport } from '@/types';

// GET /api/reports/export?format=json|csv&startDate=...&endDate=...
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['admin', 'board']);
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const format           = searchParams.get('format') ?? 'json';
  const startDate        = searchParams.get('startDate') ?? '';
  const endDate          = searchParams.get('endDate') ?? '';

  const db = getAdminFirestore();

  // Fetch all campaigns
  const campaignSnap = await db.collection('campaigns').orderBy('startDate', 'desc').get();
  const campaigns    = campaignSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Campaign[];

  // Fetch all posts
  const postSnap = await db.collection('posts').get();
  const posts    = postSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Post[];

  // Fetch all analytics
  let analyticsQuery = db.collection('analytics').orderBy('date', 'asc');
  if (startDate) analyticsQuery = analyticsQuery.where('date', '>=', startDate) as typeof analyticsQuery;
  if (endDate)   analyticsQuery = analyticsQuery.where('date', '<=', endDate)   as typeof analyticsQuery;
  const analyticsSnap = await analyticsQuery.get();
  const allAnalytics  = analyticsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as AnalyticsEntry[];

  // Fetch all impact metrics
  const impactSnap   = await db.collection('impact_metrics').get();
  const allImpact    = impactSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as ImpactMetrics[];

  // Fetch AI generation count
  const aiSnap     = await db.collection('ai_generations').get();
  const aiGenCount = aiSnap.size;

  // Build report
  const campaignSummaries = campaigns.map((campaign) => {
    const campPosts    = posts.filter((p) => p.campaignId === campaign.id);
    const campAnalytics = allAnalytics.filter((a) => a.campaignId === campaign.id);
    const campImpact   = allImpact.find((i) => i.campaignId === campaign.id) ?? null;
    const totalReach   = campAnalytics.reduce((s, a) => s + a.reach, 0);
    const avgEngagement = campAnalytics.length
      ? campAnalytics.reduce((s, a) => s + a.engagement, 0) / campAnalytics.length
      : 0;

    return {
      campaign,
      analytics:        campAnalytics,
      impact:           campImpact,
      postCount:        campPosts.length,
      aiGenerationCount: aiSnap.docs.filter((d) => d.data().campaignId === campaign.id).length,
      totalReach,
      avgEngagement,
    };
  });

  const overallReach      = allAnalytics.reduce((s, a) => s + a.reach, 0);
  const overallEngagement = allAnalytics.reduce((s, a) => s + a.engagement, 0);

  const topPosts = [...posts]
    .filter((p) => p.status === 'posted')
    .slice(0, 10);

  const report: BoardReport = {
    generatedAt:          new Date().toISOString(),
    dateRange:            { start: startDate, end: endDate },
    campaigns:            campaignSummaries,
    totalPostsCreated:    posts.length,
    totalAIGenerations:   aiGenCount,
    topPosts,
    overallEngagement,
    overallReach,
  };

  await writeAuditLog(auth.user.uid, 'report.export', undefined, { format });

  if (format === 'csv') {
    // Build CSV rows
    const rows: string[] = [
      'Report Generated,' + new Date().toLocaleDateString(),
      '',
      'CAMPAIGN SUMMARY',
      'Campaign,Status,Posts,Total Reach,Avg Engagement,Donation Clicks,Volunteer Signups',
      ...campaignSummaries.map((cs) => {
        const now    = new Date();
        const status = now < new Date(cs.campaign.startDate) ? 'upcoming'
                     : now > new Date(cs.campaign.endDate)   ? 'ended'
                     : 'active';
        return [
          `"${cs.campaign.name}"`,
          status,
          cs.postCount,
          cs.totalReach,
          cs.avgEngagement.toFixed(1),
          cs.impact?.donationClicks ?? 0,
          cs.impact?.volunteerSignups ?? 0,
        ].join(',');
      }),
      '',
      'OVERALL TOTALS',
      `Total Posts,${posts.length}`,
      `Total AI Generations,${aiGenCount}`,
      `Total Reach,${overallReach}`,
      `Total Engagement,${overallEngagement}`,
    ];

    const csv = rows.join('\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type':        'text/csv',
        'Content-Disposition': `attachment; filename="tbhf-report-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  }

  return NextResponse.json({ success: true, data: report });
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth/middleware';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { writeAuditLog } from '@/lib/utils/audit-log';
import type { AnalyticsEntry, ImpactMetrics } from '@/types';

// GET /api/analytics?campaignId=...&startDate=...&endDate=...
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const campaignId       = searchParams.get('campaignId');
  const startDate        = searchParams.get('startDate');
  const endDate          = searchParams.get('endDate');

  const db = getAdminFirestore();

  let analyticsQuery = db
    .collection('analytics')
    .orderBy('date', 'asc');

  if (campaignId) analyticsQuery = analyticsQuery.where('campaignId', '==', campaignId) as typeof analyticsQuery;
  if (startDate)  analyticsQuery = analyticsQuery.where('date', '>=', startDate)         as typeof analyticsQuery;
  if (endDate)    analyticsQuery = analyticsQuery.where('date', '<=', endDate)           as typeof analyticsQuery;

  const analyticsSnap = await analyticsQuery.get();
  const analytics: AnalyticsEntry[] = analyticsSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<AnalyticsEntry, 'id'>),
  }));

  // Fetch impact metrics
  let impactQuery = db.collection('impact_metrics');
  const impactEntries: ImpactMetrics[] = [];

  if (campaignId) {
    const impactSnap = await impactQuery.where('campaignId', '==', campaignId).get();
    impactEntries.push(
      ...impactSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ImpactMetrics)),
    );
  }

  return NextResponse.json({
    success: true,
    data:    { analytics, impact: impactEntries },
  });
}

// POST /api/analytics — add analytics entry (admin/staff only)
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['admin', 'staff']);
  if (isAuthError(auth)) return auth;

  const body = (await req.json()) as Omit<AnalyticsEntry, 'id'>;

  if (!body.campaignId || !body.date) {
    return NextResponse.json(
      { success: false, error: 'campaignId and date are required' },
      { status: 400 },
    );
  }

  const db  = getAdminFirestore();
  const ref = await db.collection('analytics').add({
    campaignId:    body.campaignId,
    date:          body.date,
    reach:         Number(body.reach)       || 0,
    engagement:    Number(body.engagement)  || 0,
    followerCount: Number(body.followerCount) || 0,
  });

  const created = await ref.get();
  await writeAuditLog(auth.user.uid, 'analytics.update', body.campaignId);

  return NextResponse.json({
    success: true,
    data:    { id: created.id, ...created.data() } as AnalyticsEntry,
  }, { status: 201 });
}

// PUT /api/analytics — upsert impact metrics
export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, ['admin', 'staff']);
  if (isAuthError(auth)) return auth;

  const body = (await req.json()) as Omit<ImpactMetrics, 'id'>;

  if (!body.campaignId) {
    return NextResponse.json(
      { success: false, error: 'campaignId is required' },
      { status: 400 },
    );
  }

  const db = getAdminFirestore();

  // Check for existing entry
  const existing = await db
    .collection('impact_metrics')
    .where('campaignId', '==', body.campaignId)
    .get();

  const data: Omit<ImpactMetrics, 'id'> = {
    campaignId:          body.campaignId,
    donationClicks:      Number(body.donationClicks)      || 0,
    volunteerSignups:    Number(body.volunteerSignups)    || 0,
    eventRegistrations:  Number(body.eventRegistrations)  || 0,
    mediaMentions:       Number(body.mediaMentions)       || 0,
  };

  let id: string;
  if (existing.empty) {
    const ref = await db.collection('impact_metrics').add(data);
    id = ref.id;
  } else {
    id = existing.docs[0].id;
    await db.collection('impact_metrics').doc(id).update(data);
  }

  return NextResponse.json({ success: true, data: { id, ...data } as ImpactMetrics });
}

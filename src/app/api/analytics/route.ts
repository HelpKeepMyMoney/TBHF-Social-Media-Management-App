import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth/middleware';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { writeAuditLog } from '@/lib/utils/audit-log';
import { parseBody } from '@/lib/validations/parse';
import { analyticsCreateSchema, impactMetricsSchema } from '@/lib/validations/schemas';
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = await parseBody(body, analyticsCreateSchema);
  if (parsed instanceof NextResponse) return parsed;
  const validated = parsed.data;

  const db  = getAdminFirestore();
  const ref = await db.collection('analytics').add({
    campaignId:    validated.campaignId,
    date:          validated.date,
    reach:         validated.reach,
    engagement:    validated.engagement,
    followerCount: validated.followerCount,
  });

  const created = await ref.get();
  await writeAuditLog(auth.user.uid, 'analytics.update', validated.campaignId);

  return NextResponse.json({
    success: true,
    data:    { id: created.id, ...created.data() } as AnalyticsEntry,
  }, { status: 201 });
}

// PUT /api/analytics — upsert impact metrics
export async function PUT(req: NextRequest) {
  const auth = await requireAuth(req, ['admin', 'staff']);
  if (isAuthError(auth)) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = await parseBody(body, impactMetricsSchema);
  if (parsed instanceof NextResponse) return parsed;
  const validated = parsed.data;

  const db = getAdminFirestore();

  // Check for existing entry
  const existing = await db
    .collection('impact_metrics')
    .where('campaignId', '==', validated.campaignId)
    .get();

  const data: Omit<ImpactMetrics, 'id'> = {
    campaignId:          validated.campaignId,
    donationClicks:      validated.donationClicks ?? 0,
    volunteerSignups:    validated.volunteerSignups ?? 0,
    eventRegistrations:  validated.eventRegistrations ?? 0,
    mediaMentions:       validated.mediaMentions ?? 0,
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

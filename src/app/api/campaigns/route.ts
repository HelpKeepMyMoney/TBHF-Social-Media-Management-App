import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth/middleware';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { writeAuditLog } from '@/lib/utils/audit-log';
import type { Campaign, CampaignFormData } from '@/types';

// GET /api/campaigns — list all campaigns
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const db   = getAdminFirestore();
  const snap = await db.collection('campaigns').orderBy('createdAt', 'desc').get();

  const campaigns: Campaign[] = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Campaign, 'id'>),
  }));

  return NextResponse.json({ success: true, data: campaigns });
}

// POST /api/campaigns — create campaign (admin/staff only)
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['admin', 'staff']);
  if (isAuthError(auth)) return auth;

  const body = (await req.json()) as CampaignFormData;

  // Basic validation
  if (!body.name?.trim()) {
    return NextResponse.json(
      { success: false, error: 'Campaign name is required' },
      { status: 400 },
    );
  }

  const db  = getAdminFirestore();
  const now = new Date().toISOString();

  const campaign: Omit<Campaign, 'id'> = {
    name:            body.name.trim(),
    description:     body.description ?? '',
    startDate:       body.startDate,
    endDate:         body.endDate,
    fundraisingGoal: Number(body.fundraisingGoal) || 0,
    awarenessGoal:   body.awarenessGoal ?? '',
    hashtag:         body.hashtag ?? '',
    keyMessage:      body.keyMessage ?? '',
    createdBy:       auth.user.uid,
    createdAt:       now,
  };

  const docRef = await db.collection('campaigns').add(campaign);
  const created: Campaign = { id: docRef.id, ...campaign };

  await writeAuditLog(auth.user.uid, 'campaign.create', docRef.id, { name: body.name });

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}

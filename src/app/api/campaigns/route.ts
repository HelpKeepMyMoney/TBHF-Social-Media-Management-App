import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth/middleware';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { writeAuditLog } from '@/lib/utils/audit-log';
import { parseBody } from '@/lib/validations/parse';
import { campaignCreateSchema } from '@/lib/validations/schemas';
import type { Campaign } from '@/types';

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = await parseBody(body, campaignCreateSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { data: validated } = parsed;

  const db  = getAdminFirestore();
  const now = new Date().toISOString();

  const campaign: Omit<Campaign, 'id'> = {
    name:            validated.name,
    description:     validated.description ?? '',
    startDate:       validated.startDate,
    endDate:         validated.endDate,
    fundraisingGoal: validated.fundraisingGoal ?? 0,
    awarenessGoal:   validated.awarenessGoal ?? '',
    hashtag:         validated.hashtag ?? '',
    keyMessage:      validated.keyMessage ?? '',
    createdBy:       auth.user.uid,
    createdAt:       now,
  };

  const docRef = await db.collection('campaigns').add(campaign);
  const created: Campaign = { id: docRef.id, ...campaign };

  await writeAuditLog(auth.user.uid, 'campaign.create', docRef.id, { name: validated.name });

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}

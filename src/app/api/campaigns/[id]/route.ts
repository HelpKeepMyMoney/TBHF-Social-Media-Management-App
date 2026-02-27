import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth/middleware';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { writeAuditLog } from '@/lib/utils/audit-log';
import { parseBody } from '@/lib/validations/parse';
import { campaignUpdateSchema } from '@/lib/validations/schemas';
import type { Campaign } from '@/types';

// GET /api/campaigns/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const db  = getAdminFirestore();
  const doc = await db.collection('campaigns').doc(params.id).get();

  if (!doc.exists) {
    return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: { id: doc.id, ...doc.data() } as Campaign,
  });
}

// PATCH /api/campaigns/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, ['admin', 'staff']);
  if (isAuthError(auth)) return auth;

  const db  = getAdminFirestore();
  const ref = db.collection('campaigns').doc(params.id);
  const doc = await ref.get();

  if (!doc.exists) {
    return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
  }

  // Staff can only edit their own campaigns
  const existing = doc.data() as Omit<Campaign, 'id'>;
  if (auth.user.role === 'staff' && existing.createdBy !== auth.user.uid) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = await parseBody(body, campaignUpdateSchema);
  if (parsed instanceof NextResponse) return parsed;
  const raw = parsed.data;
  const updates = Object.fromEntries(
    Object.entries(raw).filter(([, v]) => v !== undefined),
  ) as Record<string, unknown>;

  await ref.update({ ...updates, updatedAt: new Date().toISOString() });
  const updated = await ref.get();

  await writeAuditLog(auth.user.uid, 'campaign.update', params.id);

  return NextResponse.json({
    success: true,
    data: { id: updated.id, ...updated.data() } as Campaign,
  });
}

// DELETE /api/campaigns/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, ['admin']);
  if (isAuthError(auth)) return auth;

  const db  = getAdminFirestore();
  const ref = db.collection('campaigns').doc(params.id);
  const doc = await ref.get();

  if (!doc.exists) {
    return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
  }

  await ref.delete();
  await writeAuditLog(auth.user.uid, 'campaign.delete', params.id);

  return NextResponse.json({ success: true, data: { deleted: true } });
}

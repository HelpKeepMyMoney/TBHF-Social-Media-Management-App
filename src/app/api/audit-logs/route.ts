import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth/middleware';
import { getAdminFirestore } from '@/lib/firebase/admin';
import type { AuditLogEntry } from '@/types';

// GET /api/audit-logs — list audit logs (admin only)
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req, ['admin']);
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get('limit')) || 50, 100);
  const userId = searchParams.get('userId') ?? undefined;

  const db = getAdminFirestore();
  let query;
  if (userId) {
    query = db
      .collection('audit_logs')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit);
  } else {
    query = db.collection('audit_logs').orderBy('createdAt', 'desc').limit(limit);
  }

  const snap = await query.get();
  const logs: AuditLogEntry[] = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<AuditLogEntry, 'id'>),
  }));

  return NextResponse.json({ success: true, data: logs });
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth/middleware';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { writeAuditLog } from '@/lib/utils/audit-log';
import type { Post } from '@/types';

// GET /api/posts/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const db  = getAdminFirestore();
  const doc = await db.collection('posts').doc(params.id).get();

  if (!doc.exists) {
    return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: { id: doc.id, ...doc.data() } as Post });
}

// PATCH /api/posts/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, ['admin', 'staff']);
  if (isAuthError(auth)) return auth;

  const db  = getAdminFirestore();
  const ref = db.collection('posts').doc(params.id);
  const doc = await ref.get();

  if (!doc.exists) {
    return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
  }

  const existing = doc.data() as Omit<Post, 'id'>;
  if (auth.user.role === 'staff' && existing.createdBy !== auth.user.uid) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { id: _id, createdBy: _cb, createdAt: _ca, ...updates } = body;
  void _id; void _cb; void _ca;

  await ref.update({ ...updates, updatedAt: new Date().toISOString() });
  const updated = await ref.get();

  await writeAuditLog(auth.user.uid, 'post.update', params.id);

  return NextResponse.json({ success: true, data: { id: updated.id, ...updated.data() } as Post });
}

// DELETE /api/posts/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAuth(req, ['admin', 'staff']);
  if (isAuthError(auth)) return auth;

  const db  = getAdminFirestore();
  const ref = db.collection('posts').doc(params.id);
  const doc = await ref.get();

  if (!doc.exists) {
    return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
  }

  const existing = doc.data() as Omit<Post, 'id'>;
  if (auth.user.role === 'staff' && existing.createdBy !== auth.user.uid) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  await ref.delete();
  await writeAuditLog(auth.user.uid, 'post.delete', params.id);

  return NextResponse.json({ success: true, data: { deleted: true } });
}

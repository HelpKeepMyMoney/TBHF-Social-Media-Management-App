import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth/middleware';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { writeAuditLog } from '@/lib/utils/audit-log';
import { parseBody } from '@/lib/validations/parse';
import { postUpdateSchema } from '@/lib/validations/schemas';
import { deleteFileByUrl } from '@/lib/storage';
import { appendTagline } from '@/lib/post-tagline';
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = await parseBody(body, postUpdateSchema);
  if (parsed instanceof NextResponse) return parsed;
  const raw = parsed.data;
  const updates = Object.fromEntries(
    Object.entries(raw).filter(([, v]) => v !== undefined),
  ) as Record<string, unknown>;

  if ('mediaUrl' in updates && updates.mediaUrl !== existing.mediaUrl && existing.mediaUrl) {
    await deleteFileByUrl(existing.mediaUrl);
  }

  if ('caption' in updates && typeof updates.caption === 'string') {
    updates.caption = appendTagline(updates.caption);
  }

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

  if (existing.mediaUrl) {
    await deleteFileByUrl(existing.mediaUrl);
  }

  await ref.delete();
  await writeAuditLog(auth.user.uid, 'post.delete', params.id);

  return NextResponse.json({ success: true, data: { deleted: true } });
}

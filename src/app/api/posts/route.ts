import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth/middleware';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { writeAuditLog } from '@/lib/utils/audit-log';
import type { Post, PostFormData } from '@/types';

// GET /api/posts
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const campaignId       = searchParams.get('campaignId');
  const status           = searchParams.get('status');

  const db  = getAdminFirestore();
  let query = db.collection('posts').orderBy('scheduledTime', 'asc');

  if (campaignId) query = query.where('campaignId', '==', campaignId) as typeof query;
  if (status)     query = query.where('status', '==', status)         as typeof query;

  const snap  = await query.get();
  const posts = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Post[];

  return NextResponse.json({ success: true, data: posts });
}

// POST /api/posts
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['admin', 'staff']);
  if (isAuthError(auth)) return auth;

  const body = (await req.json()) as PostFormData;

  if (!body.campaignId || !body.caption?.trim() || !body.platform) {
    return NextResponse.json(
      { success: false, error: 'campaignId, caption, and platform are required' },
      { status: 400 },
    );
  }

  const db  = getAdminFirestore();
  const now = new Date().toISOString();

  const post: Omit<Post, 'id'> = {
    campaignId:    body.campaignId,
    caption:       body.caption.trim(),
    platform:      body.platform,
    mediaUrl:      body.mediaUrl ?? '',
    mediaType:     body.mediaType ?? 'none',
    status:        body.status ?? 'draft',
    scheduledTime: body.scheduledTime ?? null,
    createdBy:     auth.user.uid,
    createdAt:     now,
  };

  const docRef = await db.collection('posts').add(post);
  const created: Post = { id: docRef.id, ...post };

  await writeAuditLog(auth.user.uid, 'post.create', docRef.id, { platform: body.platform });

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}

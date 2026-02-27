import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth/middleware';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { writeAuditLog } from '@/lib/utils/audit-log';
import { parseBody } from '@/lib/validations/parse';
import { postCreateSchema } from '@/lib/validations/schemas';
import { appendTagline } from '@/lib/post-tagline';
import type { Post } from '@/types';

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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = await parseBody(body, postCreateSchema);
  if (parsed instanceof NextResponse) return parsed;
  const validated = parsed.data;

  const db  = getAdminFirestore();
  const now = new Date().toISOString();

  const post: Omit<Post, 'id'> = {
    campaignId:    validated.campaignId,
    caption:       appendTagline(validated.caption),
    platform:      validated.platform,
    mediaUrl:      validated.mediaUrl ?? '',
    mediaType:     validated.mediaType ?? 'none',
    status:        validated.status ?? 'draft',
    scheduledTime: validated.scheduledTime ?? null,
    createdBy:     auth.user.uid,
    createdAt:     now,
  };

  const docRef = await db.collection('posts').add(post);
  const created: Post = { id: docRef.id, ...post };

  await writeAuditLog(auth.user.uid, 'post.create', docRef.id, { platform: validated.platform });

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}

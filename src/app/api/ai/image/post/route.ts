import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth/middleware';
import { generateImageForPost } from '@/lib/ai/dalle';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { checkRateLimitAsync } from '@/lib/utils/rate-limit';
import { writeAuditLog } from '@/lib/utils/audit-log';
import { parseBody } from '@/lib/validations/parse';
import { postImageGenerationSchema } from '@/lib/validations/schemas';

const IMAGE_RATE_LIMIT = 10;

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['admin', 'staff']);
  if (isAuthError(auth)) return auth;

  const rl = await checkRateLimitAsync(`img:${auth.user.uid}`, IMAGE_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: `Image rate limit exceeded. Try again in ${Math.ceil(rl.resetIn / 1000)}s.` },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = await parseBody(body, postImageGenerationSchema);
  if (parsed instanceof NextResponse) return parsed;
  const validated = parsed.data;

  try {
    const result = await generateImageForPost({
      campaignId: validated.campaignId,
      caption: validated.caption,
      platform: validated.platform,
      dimensions: validated.dimensions ?? '1:1',
      visualType: validated.visualType ?? 'awareness-graphic',
      style: validated.style ?? 'minimal',
    });

    const db  = getAdminFirestore();
    const now = new Date().toISOString();
    await db.collection('ai_generations').add({
      userId:         auth.user.uid,
      campaignId:     validated.campaignId,
      generationType: 'image',
      prompt:         `post-image | ${validated.caption.slice(0, 200)}`,
      outputSummary:  result.storageUrl,
      mediaUrl:       result.storageUrl,
      createdAt:      now,
    });

    await writeAuditLog(auth.user.uid, 'ai.image_generate', validated.campaignId, {
      storageUrl: result.storageUrl,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error('[ai/image/post]', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'AI image generation failed' },
      { status: 500 },
    );
  }
}

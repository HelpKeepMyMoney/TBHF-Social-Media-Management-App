import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth/middleware';
import { generateSocialContent } from '@/lib/ai/claude';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { checkRateLimitAsync } from '@/lib/utils/rate-limit';
import { writeAuditLog } from '@/lib/utils/audit-log';
import { parseBody } from '@/lib/validations/parse';
import { captionGenerationSchema } from '@/lib/validations/schemas';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['admin', 'staff']);
  if (isAuthError(auth)) return auth;

  const rl = await checkRateLimitAsync(auth.user.uid);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: `Rate limit exceeded. Try again in ${Math.ceil(rl.resetIn / 1000)} seconds.`,
      },
      {
        status:  429,
        headers: { 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': String(rl.resetIn) },
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = await parseBody(body, captionGenerationSchema);
  if (parsed instanceof NextResponse) return parsed;
  const validated = parsed.data;

  const mediaHint = validated.mediaType !== 'none'
    ? ` (${validated.mediaType} post)` : '';
  const topic = validated.topic || 'engaging social media post';
  const context = validated.additionalContext
    ? `${validated.additionalContext}${mediaHint}`
    : mediaHint;

  try {
    const result = await generateSocialContent({
      campaignId: validated.campaignId,
      topic,
      contentType: 'social-post',
      tone: validated.tone ?? 'inspirational',
      platform: validated.platform,
      wordLimit: 120,
      additionalContext: context.trim() || undefined,
    });

    const db  = getAdminFirestore();
    const now = new Date().toISOString();
    await db.collection('ai_generations').add({
      userId:         auth.user.uid,
      campaignId:     validated.campaignId,
      generationType: 'text',
      prompt:         `caption | ${validated.tone} | ${topic}`,
      outputSummary:  result.caption.slice(0, 200),
      createdAt:      now,
    });

    await writeAuditLog(auth.user.uid, 'ai.text_generate', validated.campaignId);

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error('[ai/caption]', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'AI caption generation failed' },
      { status: 500 },
    );
  }
}

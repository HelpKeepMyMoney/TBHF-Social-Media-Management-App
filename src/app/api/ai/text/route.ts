import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth/middleware';
import { generateSocialContent } from '@/lib/ai/claude';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { writeAuditLog } from '@/lib/utils/audit-log';
import type { TextGenerationRequest } from '@/types';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['admin', 'staff']);
  if (isAuthError(auth)) return auth;

  // Rate limiting
  const rl = checkRateLimit(auth.user.uid);
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

  const body = (await req.json()) as TextGenerationRequest;

  if (!body.campaignId || !body.topic || !body.contentType) {
    return NextResponse.json(
      { success: false, error: 'campaignId, topic, and contentType are required' },
      { status: 400 },
    );
  }

  try {
    const result = await generateSocialContent(body);

    // Log generation to Firestore
    const db  = getAdminFirestore();
    const now = new Date().toISOString();
    await db.collection('ai_generations').add({
      userId:         auth.user.uid,
      campaignId:     body.campaignId,
      generationType: 'text',
      prompt:         `${body.contentType} | ${body.tone} | ${body.topic}`,
      outputSummary:  result.caption.slice(0, 200),
      createdAt:      now,
    });

    await writeAuditLog(auth.user.uid, 'ai.text_generate', body.campaignId);

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error('[ai/text]', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'AI generation failed' },
      { status: 500 },
    );
  }
}

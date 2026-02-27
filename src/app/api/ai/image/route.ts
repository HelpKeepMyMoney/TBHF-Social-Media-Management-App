import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth/middleware';
import { generateImage } from '@/lib/ai/dalle';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { writeAuditLog } from '@/lib/utils/audit-log';
import type { ImageGenerationRequest } from '@/types';

// Image generation costs more — tighter rate limit (10/min)
const IMAGE_RATE_LIMIT = 10;

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['admin', 'staff']);
  if (isAuthError(auth)) return auth;

  const rl = checkRateLimit(`img:${auth.user.uid}`, IMAGE_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: `Image rate limit exceeded. Try again in ${Math.ceil(rl.resetIn / 1000)}s.` },
      { status: 429 },
    );
  }

  const body = (await req.json()) as ImageGenerationRequest;

  if (!body.campaignId || !body.visualType || !body.prompt) {
    return NextResponse.json(
      { success: false, error: 'campaignId, visualType, and prompt are required' },
      { status: 400 },
    );
  }

  try {
    const result = await generateImage(body);

    // Log to Firestore
    const db  = getAdminFirestore();
    const now = new Date().toISOString();
    await db.collection('ai_generations').add({
      userId:         auth.user.uid,
      campaignId:     body.campaignId,
      generationType: 'image',
      prompt:         body.prompt.slice(0, 500),
      outputSummary:  `${body.visualType} — ${body.style} (${body.dimensions})`,
      mediaUrl:       result.storageUrl,
      createdAt:      now,
    });

    await writeAuditLog(auth.user.uid, 'ai.image_generate', body.campaignId, {
      storageUrl: result.storageUrl,
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error('[ai/image]', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Image generation failed' },
      { status: 500 },
    );
  }
}

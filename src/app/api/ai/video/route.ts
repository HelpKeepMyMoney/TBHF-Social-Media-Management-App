import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth/middleware';
import { generateVideo } from '@/lib/ai/pika';
import { generateVideoScript } from '@/lib/ai/claude';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { checkRateLimit } from '@/lib/utils/rate-limit';
import { writeAuditLog } from '@/lib/utils/audit-log';
import type { VideoGenerationRequest } from '@/types';

const VIDEO_RATE_LIMIT = 5; // Videos are expensive

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['admin', 'staff']);
  if (isAuthError(auth)) return auth;

  const rl = checkRateLimit(`vid:${auth.user.uid}`, VIDEO_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: `Video rate limit exceeded. Resets in ${Math.ceil(rl.resetIn / 1000)}s.` },
      { status: 429 },
    );
  }

  const body = (await req.json()) as VideoGenerationRequest & {
    generateScript?: boolean;
    topic?: string;
    campaignContext?: string;
  };

  if (!body.campaignId) {
    return NextResponse.json(
      { success: false, error: 'campaignId is required' },
      { status: 400 },
    );
  }

  try {
    // Optionally generate script via Claude first
    let script = body.script;
    if (body.generateScript && body.topic) {
      script = await generateVideoScript(
        body.topic,
        body.duration ?? 30,
        body.campaignContext ?? '',
      );
    }

    if (!script?.trim()) {
      return NextResponse.json(
        { success: false, error: 'A script is required for video generation' },
        { status: 400 },
      );
    }

    const result = await generateVideo({ ...body, script });

    // Log to Firestore
    const db = getAdminFirestore();
    await db.collection('ai_generations').add({
      userId:         auth.user.uid,
      campaignId:     body.campaignId,
      generationType: 'video',
      prompt:         script.slice(0, 500),
      outputSummary:  `${body.duration}s ${body.style} video`,
      mediaUrl:       result.storageUrl,
      createdAt:      new Date().toISOString(),
    });

    await writeAuditLog(auth.user.uid, 'ai.video_generate', body.campaignId);

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error('[ai/video]', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Video generation failed' },
      { status: 500 },
    );
  }
}

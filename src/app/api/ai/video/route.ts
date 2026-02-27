import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth/middleware';
import { generateVideo } from '@/lib/ai/pika';
import { generateVideoScript } from '@/lib/ai/claude';
import { getAdminFirestore } from '@/lib/firebase/admin';
import { checkRateLimitAsync } from '@/lib/utils/rate-limit';
import { writeAuditLog } from '@/lib/utils/audit-log';
import { parseBody } from '@/lib/validations/parse';
import { videoGenerationSchema } from '@/lib/validations/schemas';

const VIDEO_RATE_LIMIT = 5; // Videos are expensive

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['admin', 'staff']);
  if (isAuthError(auth)) return auth;

  const rl = await checkRateLimitAsync(`vid:${auth.user.uid}`, VIDEO_RATE_LIMIT);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: `Video rate limit exceeded. Resets in ${Math.ceil(rl.resetIn / 1000)}s.` },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = await parseBody(body, videoGenerationSchema);
  if (parsed instanceof NextResponse) return parsed;
  const validated = parsed.data;

  try {
    // Optionally generate script via Claude first
    let script = validated.script;
    if (validated.generateScript && validated.topic) {
      script = await generateVideoScript(
        validated.topic,
        validated.duration ?? 30,
        validated.campaignContext ?? '',
      );
    }

    if (!script?.trim()) {
      return NextResponse.json(
        { success: false, error: 'A script is required for video generation' },
        { status: 400 },
      );
    }

    const result = await generateVideo({
      campaignId: validated.campaignId,
      script,
      duration: validated.duration ?? 30,
      style: validated.style ?? 'social-reel',
      subtitles: validated.subtitles ?? false,
    });

    // Log to Firestore
    const db = getAdminFirestore();
    await db.collection('ai_generations').add({
      userId:         auth.user.uid,
      campaignId:     validated.campaignId,
      generationType: 'video',
      prompt:         script.slice(0, 500),
      outputSummary:  `${validated.duration}s ${validated.style} video`,
      mediaUrl:       result.storageUrl,
      createdAt:      new Date().toISOString(),
    });

    await writeAuditLog(auth.user.uid, 'ai.video_generate', validated.campaignId);

    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error('[ai/video]', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Video generation failed' },
      { status: 500 },
    );
  }
}

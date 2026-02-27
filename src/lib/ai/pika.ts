/**
 * Pika Labs video generation — server-side only.
 * Phase 2 scaffold: implement when Pika API access is confirmed.
 *
 * Pika API is currently invite-only. This module provides the integration
 * scaffold so Phase 2 implementation only requires filling in the actual
 * HTTP calls once API credentials are available.
 */
import type { VideoGenerationRequest, VideoGenerationResult } from '@/types';
import { uploadFromUrl } from '@/lib/storage';

const PIKA_API_BASE = 'https://api.pika.art/v1'; // Confirm with Pika documentation

// ─── Main generation function ─────────────────────────────────────────────────

export async function generateVideo(
  req: VideoGenerationRequest,
): Promise<VideoGenerationResult> {
  const apiKey = process.env.PIKA_API_KEY;
  if (!apiKey) {
    throw new Error('PIKA_API_KEY is not configured. Video generation is not yet available.');
  }

  // ── Step 1: Submit generation job ──────────────────────────────────────────
  const submitResponse = await fetch(`${PIKA_API_BASE}/generate`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      script:    req.script,
      duration:  req.duration,
      style:     req.style,
      subtitles: req.subtitles,
      // Add Pika-specific parameters here once API docs are available
    }),
  });

  if (!submitResponse.ok) {
    const err = await submitResponse.text();
    throw new Error(`Pika API submission failed: ${err}`);
  }

  const { jobId } = (await submitResponse.json()) as { jobId: string };

  // ── Step 2: Poll for completion ────────────────────────────────────────────
  const maxAttempts = 60; // 5 minutes at 5s intervals
  const pollInterval = 5000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise((r) => setTimeout(r, pollInterval));

    const statusResponse = await fetch(`${PIKA_API_BASE}/jobs/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!statusResponse.ok) continue;

    const status = (await statusResponse.json()) as {
      state:        string;
      videoUrl?:    string;
      thumbnailUrl?: string;
      error?:       string;
    };

    if (status.state === 'completed' && status.videoUrl) {
      // ── Step 3: Upload to permanent storage ─────────────────────────────
      const filename = `ai-videos/${Date.now()}-video.mp4`;
      const uploadResult = await uploadFromUrl(status.videoUrl, filename, 'video/mp4');

      return {
        videoUrl:     status.videoUrl,
        storageUrl:   uploadResult.url,
        thumbnailUrl: status.thumbnailUrl,
      };
    }

    if (status.state === 'failed') {
      throw new Error(`Pika video generation failed: ${status.error ?? 'Unknown error'}`);
    }
  }

  throw new Error('Pika video generation timed out after 5 minutes');
}

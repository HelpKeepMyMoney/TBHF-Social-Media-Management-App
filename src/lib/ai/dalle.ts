/**
 * DALL-E 3 image generation — server-side only.
 * Generates images and uploads them to hosting storage.
 */
import OpenAI from 'openai';
import type { ImageGenerationRequest, ImageGenerationResult } from '@/types';
import { uploadFile } from '@/lib/storage';
import { compressImageUnder1MB } from '@/lib/image-compress';

let client: OpenAI;

function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  }
  return client;
}

// ─── Dimension mapping ────────────────────────────────────────────────────────

const DIMENSION_MAP: Record<string, '1024x1024' | '1792x1024' | '1024x1792'> = {
  '1:1':   '1024x1024',
  '16:9':  '1792x1024',
  '9:16':  '1024x1792',
  '4:5':   '1024x1024', // DALL-E 3 doesn't support 4:5; use square and crop in UI
};

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildImagePrompt(req: ImageGenerationRequest): string {
  const typeGuide: Record<string, string> = {
    'quote-card':         'A clean, typographic quote card with the text prominently displayed',
    'event-promo':        'An eye-catching event promotional graphic with space for event details',
    'awareness-graphic':  'A powerful awareness campaign graphic conveying the cause',
    'donation-appeal':    'An emotionally resonant donation appeal image showing impact',
    'impact-stat':        'A bold infographic-style image highlighting a key impact statistic',
  };

  const styleGuide: Record<string, string> = {
    'photorealistic':   'photorealistic photography style, authentic and documentary',
    'illustrated':      'clean digital illustration, friendly and approachable',
    'minimal':          'minimalist design with generous whitespace and clean lines',
    'bold-typography':  'bold typographic-focused composition, strong visual hierarchy',
    'watercolor':       'soft watercolor artistic style, warm and human',
  };

  const baseDesc = typeGuide[req.visualType] || 'A professional The Black History Foundation social media graphic';
  const styleDesc = styleGuide[req.style] || 'professional and polished';

  return `${baseDesc}. ${styleDesc}.
Campaign context: ${req.additionalContext || 'The Black History Foundation (TBHF) nonprofit organization social media content'}
Additional direction: ${req.prompt}
Style: ${styleDesc}
Color palette: warm, inviting tones with amber/earth tones
Must look professional and suitable for The Black History Foundation nonprofit social media.
IMPORTANT: Use minimal or no text in the image. Prefer purely visual imagery. If any text is absolutely necessary, use only a single word or very short phrase.
Do NOT include: watermarks, logos (unless specified), offensive content, photorealistic human faces, or lengthy text.`;
}

// ─── Main generation function ─────────────────────────────────────────────────

export async function generateImage(
  req: ImageGenerationRequest,
): Promise<ImageGenerationResult> {
  const openai = getClient();

  const size = DIMENSION_MAP[req.dimensions] ?? '1024x1024';
  const prompt = buildImagePrompt(req);

  const response = await openai.images.generate({
    model:   'dall-e-3',
    prompt,
    n:       1,
    size,
    quality: 'standard',
    style:   req.style === 'photorealistic' ? 'natural' : 'vivid',
  });

  const imageData = response.data?.[0];
  if (!imageData?.url) {
    throw new Error('DALL-E API did not return an image URL');
  }

  const res = await fetch(imageData.url);
  if (!res.ok) throw new Error('Failed to fetch generated image');
  let buffer = Buffer.from(await res.arrayBuffer());

  const MAX_BYTES = 1024 * 1024;
  let contentType = 'image/png';
  let ext = 'png';
  if (buffer.byteLength > MAX_BYTES) {
    buffer = Buffer.from(await compressImageUnder1MB(buffer));
    contentType = 'image/webp';
    ext = 'webp';
  }

  const filename = `ai-images/${Date.now()}-${req.visualType}.${ext}`;
  const uploadResult = await uploadFile(buffer, filename, contentType);

  return {
    imageUrl:      imageData.url,
    storageUrl:    uploadResult.url,
    revisedPrompt: imageData.revised_prompt ?? prompt,
  };
}

// ─── Post image generation (caption-based) ────────────────────────────────────

export interface PostImageRequest {
  campaignId: string;
  caption: string;
  platform: string;
  dimensions?: '1:1' | '4:5' | '16:9' | '9:16';
  visualType?: 'quote-card' | 'event-promo' | 'awareness-graphic' | 'donation-appeal' | 'impact-stat';
  style?: 'photorealistic' | 'illustrated' | 'minimal' | 'bold-typography' | 'watercolor';
}

/**
 * Generates an image from a post caption using a ChatGPT-style prompt:
 * caption-first, minimal constraints, HD quality.
 */
export async function generateImageForPost(
  req: PostImageRequest,
): Promise<ImageGenerationResult> {
  const caption = req.caption
    .replace(/#\w+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 1000);

  const prompt = `Create a purely visual image that illustrates the theme or concept of this social media post. Do NOT include any text, words, letters, numbers, or phrases in the image. Convey the message through imagery, symbols, colors, and composition only—no writing whatsoever.

Post theme to illustrate:
${caption}

Professional quality, suitable for The Black History Foundation (TBHF) nonprofit social media. The image must be entirely text-free.`;

  const openai = getClient();
  const size = DIMENSION_MAP[req.dimensions ?? '1:1'];

  const response = await openai.images.generate({
    model:   'dall-e-3',
    prompt,
    n:       1,
    size,
    quality: 'hd',
    style:   req.style === 'photorealistic' ? 'natural' : 'vivid',
  });

  const imageData = response.data?.[0];
  if (!imageData?.url) {
    throw new Error('DALL-E API did not return an image URL');
  }

  const res = await fetch(imageData.url);
  if (!res.ok) throw new Error('Failed to fetch generated image');
  let buffer = Buffer.from(await res.arrayBuffer());

  const MAX_BYTES = 1024 * 1024;
  let contentType = 'image/png';
  let ext = 'png';
  if (buffer.byteLength > MAX_BYTES) {
    buffer = Buffer.from(await compressImageUnder1MB(buffer));
    contentType = 'image/webp';
    ext = 'webp';
  }

  const filename = `ai-images/${Date.now()}-post.${ext}`;
  const uploadResult = await uploadFile(buffer, filename, contentType);

  return {
    imageUrl:      imageData.url,
    storageUrl:    uploadResult.url,
    revisedPrompt: imageData.revised_prompt ?? prompt,
  };
}

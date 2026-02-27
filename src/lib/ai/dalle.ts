/**
 * DALL-E 3 image generation — server-side only.
 * Generates images and uploads them to hosting storage.
 */
import OpenAI from 'openai';
import type { ImageGenerationRequest, ImageGenerationResult } from '@/types';
import { uploadFromUrl } from '@/lib/storage';

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

  const baseDesc = typeGuide[req.visualType] || 'A professional nonprofit social media graphic';
  const styleDesc = styleGuide[req.style] || 'professional and polished';

  return `${baseDesc}. ${styleDesc}.
Campaign context: ${req.additionalContext || 'Nonprofit organization social media content'}
Additional direction: ${req.prompt}
Style: ${styleDesc}
Color palette: warm, inviting tones with amber/earth tones
Must look professional and suitable for nonprofit social media.
Do NOT include: watermarks, logos (unless specified), offensive content, or photorealistic human faces.`;
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
    quality: 'hd',
    style:   req.style === 'photorealistic' ? 'natural' : 'vivid',
  });

  const imageData = response.data[0];
  if (!imageData.url) {
    throw new Error('DALL-E API did not return an image URL');
  }

  // Upload the OpenAI temporary URL to our permanent storage
  const filename = `ai-images/${Date.now()}-${req.visualType}.png`;
  const uploadResult = await uploadFromUrl(imageData.url, filename, 'image/png');

  return {
    imageUrl:      imageData.url,
    storageUrl:    uploadResult.url,
    revisedPrompt: imageData.revised_prompt ?? prompt,
  };
}

/**
 * Claude API integration — server-side only.
 * Handles text generation for social media content.
 */
import Anthropic from '@anthropic-ai/sdk';
import type {
  TextGenerationRequest,
  TextGenerationResult,
  ContentTone,
  ContentType,
  Platform,
} from '@/types';

let client: Anthropic;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });
  }
  return client;
}

// ─── Prompt templates ────────────────────────────────────────────────────────

const TONE_DESCRIPTORS: Record<ContentTone, string> = {
  inspirational:   'uplifting, hopeful, and emotionally resonant — focus on impact and possibility',
  urgent:          'time-sensitive, action-oriented, and compelling — create a sense of importance',
  informative:     'clear, fact-based, and educational — prioritize accuracy and clarity',
  celebratory:     'joyful, proud, and energetic — highlight achievements and milestones',
  conversational:  'warm, friendly, and approachable — feel like a message from a trusted neighbor',
};

const PLATFORM_GUIDANCE: Record<Platform, string> = {
  instagram:  'Use emojis tastefully. Hashtags at the end. 2,200 char max. Strong hook in first line.',
  facebook:   'Longer-form friendly. Include a clear CTA. 63,206 char max. Encourage sharing.',
  twitter:    'Keep under 280 characters. Punchy and direct. 1–2 hashtags max.',
  linkedin:   'Professional yet human tone. Include data/impact. Use line breaks for readability.',
  tiktok:     'Casual, trend-aware, energetic. Keep captions short. Focus on the hook.',
};

const CONTENT_TYPE_GUIDANCE: Record<ContentType, string> = {
  'social-post':          'A standalone social media post',
  'newsletter':           'Newsletter section or teaser',
  'event-announcement':   'Promote an upcoming event (include date/time if known)',
  'fundraising-appeal':   'Encourage donations with emotional storytelling + data',
  'impact-story':         'Highlight real outcomes and beneficiary stories',
  'volunteer-recruitment':'Inspire people to give their time; emphasize community',
};

function buildSystemPrompt(): string {
  return `You are a mission-driven content strategist for a nonprofit organization.
Your role is to craft authentic, compelling social media content that:
- Reflects the organization's values and voice
- Inspires action (donations, volunteering, engagement)
- Maintains brand consistency across campaigns
- Respects character/word limits for each platform

Always return valid JSON matching the exact schema requested.
Never fabricate statistics or specific facts not provided in the input.`;
}

function buildUserPrompt(req: TextGenerationRequest): string {
  return `Generate social media content for the following:

**Campaign Context:** ${req.additionalContext || 'No additional context provided'}
**Topic:** ${req.topic}
**Content Type:** ${CONTENT_TYPE_GUIDANCE[req.contentType]}
**Tone:** ${TONE_DESCRIPTORS[req.tone]}
**Target Platform:** ${req.platform} — ${PLATFORM_GUIDANCE[req.platform]}
**Word Limit:** Approximately ${req.wordLimit} words for the main caption

Return a JSON object with exactly this structure:
{
  "caption": "The primary post caption optimized for ${req.platform}",
  "shortVersion": "A condensed version under 50 words",
  "longVersion": "An expanded version suitable for a newsletter or Facebook post (150–300 words)",
  "ctaSuggestions": ["CTA 1", "CTA 2", "CTA 3"],
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"]
}

Return ONLY the JSON object. No markdown fences or extra text.`;
}

// ─── Main generation function ─────────────────────────────────────────────────

export async function generateSocialContent(
  req: TextGenerationRequest,
): Promise<TextGenerationResult> {
  const anthropic = getClient();

  const message = await anthropic.messages.create({
    model:      'claude-opus-4-6',
    max_tokens: 1500,
    system:     buildSystemPrompt(),
    messages: [
      { role: 'user', content: buildUserPrompt(req) },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude API');
  }

  let parsed: TextGenerationResult;
  try {
    // Strip potential markdown fences if model wraps despite instructions
    const raw = content.text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${content.text.slice(0, 200)}`);
  }

  // Basic validation
  if (!parsed.caption || !parsed.hashtags || !Array.isArray(parsed.hashtags)) {
    throw new Error('Claude response missing required fields');
  }

  return parsed;
}

// ─── Script generation for video ─────────────────────────────────────────────

export async function generateVideoScript(
  topic: string,
  duration: 15 | 30,
  campaignContext: string,
): Promise<string> {
  const anthropic = getClient();

  const message = await anthropic.messages.create({
    model:      'claude-opus-4-6',
    max_tokens: 600,
    system:     buildSystemPrompt(),
    messages: [
      {
        role: 'user',
        content: `Write a ${duration}-second video script for a nonprofit social media reel.
Campaign: ${campaignContext}
Topic: ${topic}

Guidelines:
- Approximately ${duration * 2.5} words (average speaking pace)
- Hook in the first 3 seconds
- Clear CTA in the final 5 seconds
- Include [PAUSE] markers for natural breaks
- Suitable for voiceover or on-screen text

Return only the script text, no additional commentary.`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude API');
  }

  return content.text.trim();
}

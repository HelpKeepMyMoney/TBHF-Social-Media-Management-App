/**
 * Zod schemas for API request validation.
 * Use with parseAsync for runtime validation.
 */
import { z } from 'zod';

const platformSchema = z.enum(['instagram', 'facebook', 'twitter', 'linkedin', 'tiktok']);
const mediaTypeSchema = z.enum(['image', 'video', 'none']);
const postStatusSchema = z.enum(['draft', 'scheduled', 'posted']);
const userRoleSchema = z.enum(['admin', 'staff', 'board']);
const contentTypeSchema = z.enum([
  'social-post',
  'newsletter',
  'event-announcement',
  'fundraising-appeal',
  'impact-story',
  'volunteer-recruitment',
]);
const contentToneSchema = z.enum(['inspirational', 'urgent', 'informative', 'celebratory', 'conversational']);
const imageVisualTypeSchema = z.enum(['quote-card', 'event-promo', 'awareness-graphic', 'donation-appeal', 'impact-stat']);
const imageStyleSchema = z.enum(['photorealistic', 'illustrated', 'minimal', 'bold-typography', 'watercolor']);
const imageDimensionsSchema = z.enum(['1:1', '4:5', '16:9', '9:16']);
const videoStyleSchema = z.enum(['documentary', 'social-reel', 'text-motion', 'interview']);

// ─── Campaign ────────────────────────────────────────────────────────────────

export const campaignCreateSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(200),
  description: z.string().optional().default(''),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  fundraisingGoal: z.coerce.number().min(0).default(0),
  awarenessGoal: z.string().optional().default(''),
  hashtag: z.string().optional().default(''),
  keyMessage: z.string().optional().default(''),
});

export const campaignUpdateSchema = campaignCreateSchema.partial();

// ─── Post ────────────────────────────────────────────────────────────────────

export const postCreateSchema = z.object({
  campaignId: z.string().min(1, 'campaignId is required'),
  caption: z.string().min(1, 'Caption is required').max(2120),
  platform: platformSchema,
  mediaUrl: z.string().optional().default(''),
  mediaType: mediaTypeSchema.optional().default('none'),
  status: postStatusSchema.optional().default('draft'),
  scheduledTime: z.string().nullable().optional().default(null),
});

export const postUpdateSchema = z.object({
  campaignId: z.string().min(1).optional(),
  caption: z.string().min(1).max(2120).optional(),
  platform: platformSchema.optional(),
  mediaUrl: z.string().optional(),
  mediaType: mediaTypeSchema.optional(),
  status: postStatusSchema.optional(),
  scheduledTime: z.string().nullable().optional(),
});

// ─── User ────────────────────────────────────────────────────────────────────

export const userCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: z.string().email('Valid email is required'),
  role: userRoleSchema,
});

// ─── Analytics ───────────────────────────────────────────────────────────────

export const analyticsCreateSchema = z.object({
  campaignId: z.string().min(1, 'campaignId is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  reach: z.coerce.number().min(0).default(0),
  engagement: z.coerce.number().min(0).default(0),
  followerCount: z.coerce.number().min(0).default(0),
});

export const impactMetricsSchema = z.object({
  campaignId: z.string().min(1, 'campaignId is required'),
  donationClicks: z.coerce.number().min(0).default(0),
  volunteerSignups: z.coerce.number().min(0).default(0),
  eventRegistrations: z.coerce.number().min(0).default(0),
  mediaMentions: z.coerce.number().min(0).default(0),
});

// ─── AI ──────────────────────────────────────────────────────────────────────

export const textGenerationSchema = z.object({
  campaignId: z.string().min(1, 'campaignId is required'),
  topic: z.string().min(1, 'Topic is required'),
  contentType: contentTypeSchema,
  tone: contentToneSchema.optional().default('inspirational'),
  platform: platformSchema,
  wordLimit: z.coerce.number().min(50).max(500).optional().default(150),
  additionalContext: z.string().optional(),
});

export const captionGenerationSchema = z.object({
  campaignId: z.string().min(1, 'campaignId is required'),
  platform: platformSchema,
  topic: z.string().optional().default('engaging social media post'),
  mediaType: mediaTypeSchema.optional().default('none'),
  tone: contentToneSchema.optional().default('inspirational'),
  additionalContext: z.string().optional(),
});

export const imageGenerationSchema = z.object({
  campaignId: z.string().min(1, 'campaignId is required'),
  visualType: imageVisualTypeSchema,
  style: imageStyleSchema.optional().default('minimal'),
  dimensions: imageDimensionsSchema.optional().default('1:1'),
  prompt: z.string().min(1, 'Prompt is required').max(1000),
  additionalContext: z.string().optional(),
});

export const postImageGenerationSchema = z.object({
  campaignId: z.string().min(1, 'campaignId is required'),
  caption: z.string().min(1, 'Caption is required').max(2000),
  platform: platformSchema,
  dimensions: imageDimensionsSchema.optional().default('1:1'),
  visualType: imageVisualTypeSchema.optional().default('awareness-graphic'),
  style: imageStyleSchema.optional().default('minimal'),
});

export const videoGenerationSchema = z.object({
  campaignId: z.string().min(1, 'campaignId is required'),
  script: z.string().optional(),
  duration: z.union([z.literal(15), z.literal(30)]).optional().default(30),
  style: videoStyleSchema.optional().default('social-reel'),
  subtitles: z.boolean().optional().default(false),
  generateScript: z.boolean().optional(),
  topic: z.string().optional(),
  campaignContext: z.string().optional(),
});

// ─── Query params ────────────────────────────────────────────────────────────

export const reportsExportQuerySchema = z.object({
  format: z.enum(['json', 'csv']).optional().default('json'),
  startDate: z.string().optional().default(''),
  endDate: z.string().optional().default(''),
});

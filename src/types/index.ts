// ─── User & Auth ────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'staff' | 'board';

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string; // ISO string
}

// ─── Campaign ────────────────────────────────────────────────────────────────

export interface Campaign {
  id: string;
  name: string;
  description: string;
  startDate: string;       // ISO date string
  endDate: string;         // ISO date string
  fundraisingGoal: number; // USD
  awarenessGoal: string;   // e.g. "Reach 10,000 people"
  hashtag: string;
  keyMessage: string;
  createdBy: string;       // uid
  createdAt: string;       // ISO string
}

export type CampaignFormData = Omit<Campaign, 'id' | 'createdBy' | 'createdAt'>;

// ─── Post ────────────────────────────────────────────────────────────────────

export type Platform = 'instagram' | 'facebook' | 'twitter' | 'linkedin' | 'tiktok';
export type MediaType = 'image' | 'video' | 'none';
export type PostStatus = 'draft' | 'scheduled' | 'posted';

export interface Post {
  id: string;
  campaignId: string;
  caption: string;
  platform: Platform;
  mediaUrl: string;
  mediaType: MediaType;
  status: PostStatus;
  scheduledTime: string | null; // ISO string
  createdBy: string;             // uid
  createdAt: string;             // ISO string
}

export type PostFormData = Omit<Post, 'id' | 'createdBy' | 'createdAt'>;

// ─── AI Generations ──────────────────────────────────────────────────────────

export type GenerationType = 'text' | 'image' | 'video';
export type ContentTone = 'inspirational' | 'urgent' | 'informative' | 'celebratory' | 'conversational';
export type ContentType =
  | 'social-post'
  | 'newsletter'
  | 'event-announcement'
  | 'fundraising-appeal'
  | 'impact-story'
  | 'volunteer-recruitment';

export interface AIGeneration {
  id: string;
  userId: string;
  campaignId: string;
  generationType: GenerationType;
  prompt: string;
  outputSummary: string;
  mediaUrl?: string;
  createdAt: string;
}

// Text generation specific
export interface TextGenerationRequest {
  campaignId: string;
  topic: string;
  contentType: ContentType;
  tone: ContentTone;
  platform: Platform;
  wordLimit: number;
  additionalContext?: string;
}

export interface TextGenerationResult {
  caption: string;
  shortVersion: string;
  longVersion: string;
  ctaSuggestions: string[];
  hashtags: string[];
}

// Image generation specific
export type ImageVisualType = 'quote-card' | 'event-promo' | 'awareness-graphic' | 'donation-appeal' | 'impact-stat';
export type ImageStyle = 'photorealistic' | 'illustrated' | 'minimal' | 'bold-typography' | 'watercolor';
export type ImageDimensions = '1:1' | '4:5' | '16:9' | '9:16';

export interface ImageGenerationRequest {
  campaignId: string;
  visualType: ImageVisualType;
  style: ImageStyle;
  dimensions: ImageDimensions;
  prompt: string;
  additionalContext?: string;
}

export interface ImageGenerationResult {
  imageUrl: string;
  storageUrl: string; // URL after upload to hosting storage
  revisedPrompt: string;
}

// Video generation specific (Phase 2 scaffold)
export type VideoStyle = 'documentary' | 'social-reel' | 'text-motion' | 'interview';

export interface VideoGenerationRequest {
  campaignId: string;
  script: string;
  duration: 15 | 30;
  style: VideoStyle;
  subtitles: boolean;
}

export interface VideoGenerationResult {
  videoUrl: string;
  storageUrl: string;
  thumbnailUrl?: string;
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface AnalyticsEntry {
  id: string;
  campaignId: string;
  date: string; // ISO date string YYYY-MM-DD
  reach: number;
  engagement: number;
  followerCount: number;
}

export interface ImpactMetrics {
  id: string;
  campaignId: string;
  donationClicks: number;
  volunteerSignups: number;
  eventRegistrations: number;
  mediaMentions: number;
}

export interface CampaignAnalyticsSummary {
  campaign: Campaign;
  analytics: AnalyticsEntry[];
  impact: ImpactMetrics | null;
  postCount: number;
  aiGenerationCount: number;
  totalReach: number;
  avgEngagement: number;
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Report ──────────────────────────────────────────────────────────────────

export interface BoardReport {
  generatedAt: string;
  dateRange: { start: string; end: string };
  campaigns: CampaignAnalyticsSummary[];
  totalPostsCreated: number;
  totalAIGenerations: number;
  topPosts: Post[];
  overallEngagement: number;
  overallReach: number;
}

// ─── Storage ─────────────────────────────────────────────────────────────────

export type StorageProvider = 'vercel-blob' | 's3' | 'r2' | 'firebase';

export interface UploadResult {
  url: string;
  key: string;
  provider: StorageProvider;
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

export type AuditAction =
  | 'campaign.create'
  | 'campaign.update'
  | 'campaign.delete'
  | 'post.create'
  | 'post.update'
  | 'post.delete'
  | 'ai.text_generate'
  | 'ai.image_generate'
  | 'ai.video_generate'
  | 'media.upload'
  | 'report.export'
  | 'analytics.update';

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: AuditAction;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

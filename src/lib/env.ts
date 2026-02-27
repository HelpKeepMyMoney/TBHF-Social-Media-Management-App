/**
 * Environment variable validation.
 * Call validateEnv() at server startup to fail fast on missing/invalid config.
 */
import { z } from 'zod';

const envSchema = z.object({
  // Firebase Client (required for client-side auth)
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1, 'NEXT_PUBLIC_FIREBASE_API_KEY is required'),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1, 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is required'),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1, 'NEXT_PUBLIC_FIREBASE_PROJECT_ID is required'),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional().default(''),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional().default(''),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1, 'NEXT_PUBLIC_FIREBASE_APP_ID is required'),

  // Firebase Admin (required for API routes)
  FIREBASE_PROJECT_ID: z.string().min(1, 'FIREBASE_PROJECT_ID is required'),
  FIREBASE_CLIENT_EMAIL: z.string().min(1, 'FIREBASE_CLIENT_EMAIL is required'),
  FIREBASE_PRIVATE_KEY: z.string().min(1, 'FIREBASE_PRIVATE_KEY is required'),

  // AI APIs (optional — features degrade gracefully)
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  PIKA_API_KEY: z.string().optional(),

  // Storage (validated when provider is used)
  STORAGE_PROVIDER: z.enum(['vercel-blob', 's3', 'r2']).optional().default('vercel-blob'),
  BLOB_READ_WRITE_TOKEN: z.string().optional(),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_REGION: z.string().optional(),
  STORAGE_ACCESS_KEY_ID: z.string().optional(),
  STORAGE_SECRET_ACCESS_KEY: z.string().optional(),
  STORAGE_ENDPOINT: z.string().optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:3000'),
  AI_RATE_LIMIT_RPM: z.coerce.number().min(1).max(100).optional().default(20),

  // Upstash Redis (optional — falls back to in-memory rate limit)
  UPSTASH_REDIS_REST_URL: z
    .union([z.string().url(), z.literal('')])
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  UPSTASH_REDIS_REST_TOKEN: z
    .string()
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
});

export type ValidatedEnv = z.infer<typeof envSchema>;

let validated: ValidatedEnv | null = null;

/**
 * Validates environment variables. Call once at server startup.
 * Throws with a descriptive error if validation fails.
 */
export function validateEnv(): ValidatedEnv {
  if (validated) return validated;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const firstError = result.error.errors[0];
    const path = firstError?.path?.join('.') ?? 'env';
    const msg = firstError?.message ?? 'Invalid configuration';
    throw new Error(`Environment validation failed [${path}]: ${msg}`);
  }
  validated = result.data;
  return validated;
}

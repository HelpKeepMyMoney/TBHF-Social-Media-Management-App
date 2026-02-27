/**
 * Media storage abstraction layer.
 *
 * Supports multiple providers via STORAGE_PROVIDER env var:
 *   - vercel-blob  (default) — Vercel Blob Storage
 *   - s3           — AWS S3 or any S3-compatible service
 *   - r2           — Cloudflare R2 (S3-compatible, set STORAGE_ENDPOINT)
 *
 * All providers return a consistent { url, key, provider } result.
 * File URLs are stored in Firestore; files are NOT stored in Firebase.
 */

import type { UploadResult, StorageProvider } from '@/types';

const provider = (process.env.STORAGE_PROVIDER as StorageProvider) ?? 'vercel-blob';

// ─── Vercel Blob ──────────────────────────────────────────────────────────────

async function uploadToVercelBlob(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<UploadResult> {
  // Dynamic import so the package is only loaded when needed
  const { put } = await import('@vercel/blob');
  const blob = await put(filename, buffer, {
    access:      'public',
    contentType,
  });
  return { url: blob.url, key: filename, provider: 'vercel-blob' };
}

// ─── S3 / R2 ─────────────────────────────────────────────────────────────────

async function uploadToS3(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<UploadResult> {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

  const s3 = new S3Client({
    region:      process.env.STORAGE_REGION ?? 'auto',
    endpoint:    process.env.STORAGE_ENDPOINT,
    credentials: {
      accessKeyId:     process.env.STORAGE_ACCESS_KEY_ID!,
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY!,
    },
  });

  await s3.send(
    new PutObjectCommand({
      Bucket:      process.env.STORAGE_BUCKET!,
      Key:         filename,
      Body:        buffer,
      ContentType: contentType,
    }),
  );

  const endpoint = process.env.STORAGE_ENDPOINT ?? `https://s3.${process.env.STORAGE_REGION}.amazonaws.com`;
  const url = `${endpoint}/${process.env.STORAGE_BUCKET}/${filename}`;
  return { url, key: filename, provider: provider === 'r2' ? 'r2' : 's3' };
}

// ─── Unified upload interface ─────────────────────────────────────────────────

export async function uploadFile(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<UploadResult> {
  validateFile(buffer, contentType);

  switch (provider) {
    case 'vercel-blob':
      return uploadToVercelBlob(buffer, filename, contentType);
    case 's3':
    case 'r2':
      return uploadToS3(buffer, filename, contentType);
    default:
      throw new Error(`Unknown storage provider: ${provider}`);
  }
}

/**
 * Fetches a remote URL and uploads to storage (used for AI-generated media).
 */
export async function uploadFromUrl(
  url: string,
  filename: string,
  contentType: string,
): Promise<UploadResult> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch remote URL: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return uploadFile(buffer, filename, contentType);
}

// ─── Validation ───────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export function validateFile(buffer: Buffer, contentType: string): void {
  if (!ALLOWED_MIME_TYPES.has(contentType)) {
    throw new Error(`File type not allowed: ${contentType}`);
  }
  if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File exceeds maximum size of 50 MB`);
  }
}

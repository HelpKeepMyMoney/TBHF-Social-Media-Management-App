/**
 * Media storage abstraction layer.
 *
 * Supports multiple providers via STORAGE_PROVIDER env var:
 *   - vercel-blob  (default) — Vercel Blob Storage
 *   - s3           — AWS S3 or any S3-compatible service
 *   - r2           — Cloudflare R2 (S3-compatible, set STORAGE_ENDPOINT)
 *   - firebase     — Firebase Storage (uses FIREBASE_STORAGE_BUCKET or NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)
 *
 * All providers return a consistent { url, key, provider } result.
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

// ─── Firebase Storage ─────────────────────────────────────────────────────────

async function uploadToFirebase(
  buffer: Buffer,
  filename: string,
  contentType: string,
): Promise<UploadResult> {
  const { getAdminStorage } = await import('@/lib/firebase/admin');
  const bucket = getAdminStorage().bucket();

  const file = bucket.file(filename);
  await file.save(buffer, { metadata: { contentType } });
  await file.makePublic();

  const bucketName = bucket.name;
  const url = `https://storage.googleapis.com/${bucketName}/${filename}`;

  return { url, key: filename, provider: 'firebase' };
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
    case 'firebase':
      return uploadToFirebase(buffer, filename, contentType);
    default:
      throw new Error(`Unknown storage provider: ${provider}`);
  }
}

/**
 * Deletes a file from storage by its URL.
 * Supports Firebase Storage URLs (storage.googleapis.com and firebasestorage.googleapis.com).
 * Attempts deletion when URL is Firebase Storage regardless of STORAGE_PROVIDER.
 */
export async function deleteFileByUrl(url: string): Promise<void> {
  if (!url?.startsWith('http')) return;

  const isFirebaseStorage =
    url.includes('storage.googleapis.com') || url.includes('firebasestorage.googleapis.com');
  if (!isFirebaseStorage) return;

  try {
    const { getAdminStorage } = await import('@/lib/firebase/admin');
    const storage = getAdminStorage();

    let bucketName: string;
    let filePath: string;

    if (url.includes('firebasestorage.googleapis.com')) {
      const match = url.match(/\/b\/([^/]+)\/o\/([^?]+)/);
      if (!match) return;
      bucketName = match[1];
      filePath = decodeURIComponent(match[2]);
      const bucket = storage.bucket(bucketName);
      await bucket.file(filePath).delete();
    } else {
      const parsed = new URL(url);
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      if (pathParts.length < 2) return;
      bucketName = pathParts[0];
      filePath = pathParts.slice(1).join('/');
      const bucket = storage.bucket(bucketName);
      await bucket.file(filePath).delete();
    }
  } catch (err) {
    console.error('[storage] deleteFileByUrl failed:', err);
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

/** Magic bytes (file signatures) per MIME type. Each entry: [offset, expected bytes] */
const FILE_SIGNATURES: Record<string, [number, number[]][]> = {
  'image/jpeg': [[0, [0xff, 0xd8, 0xff]]],
  'image/jpg':  [[0, [0xff, 0xd8, 0xff]]],
  'image/png':  [[0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]]],
  'image/gif':  [
    [0, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]], // GIF87a
    [0, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]], // GIF89a
  ],
  'image/webp': [
    // WebP requires both RIFF at 0 and WEBP at 8 (avoids false positives like WAV)
    [0, [0x52, 0x49, 0x46, 0x46]],
    [8, [0x57, 0x45, 0x42, 0x50]],
  ],
  'video/mp4':  [
    [4, [0x66, 0x74, 0x79, 0x70]], // ftyp at common offsets
    [8, [0x66, 0x74, 0x79, 0x70]],
  ],
  'video/webm': [[0, [0x1a, 0x45, 0xdf, 0xa3]]], // EBML
  'video/quicktime': [
    [4, [0x66, 0x74, 0x79, 0x70]], // ftyp (QT uses same box structure)
  ],
};

function bufferStartsWith(buffer: Buffer, offset: number, expected: number[]): boolean {
  if (buffer.length < offset + expected.length) return false;
  for (let i = 0; i < expected.length; i++) {
    if (buffer[offset + i] !== expected[i]) return false;
  }
  return true;
}

function matchesAnySignature(buffer: Buffer, signatures: [number, number[]][]): boolean {
  return signatures.some(([offset, expected]) => bufferStartsWith(buffer, offset, expected));
}

function matchesAllSignatures(buffer: Buffer, signatures: [number, number[]][]): boolean {
  return signatures.every(([offset, expected]) => bufferStartsWith(buffer, offset, expected));
}

/** Formats that require ALL signatures to match (e.g. WebP needs RIFF + WEBP) */
const REQUIRE_ALL_SIGNATURES = new Set(['image/webp']);

export function validateFile(buffer: Buffer, contentType: string): void {
  if (!ALLOWED_MIME_TYPES.has(contentType)) {
    throw new Error(`File type not allowed: ${contentType}`);
  }
  if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File exceeds maximum size of 50 MB`);
  }
  const signatures = FILE_SIGNATURES[contentType];
  if (signatures) {
    const matches = REQUIRE_ALL_SIGNATURES.has(contentType)
      ? matchesAllSignatures(buffer, signatures)
      : matchesAnySignature(buffer, signatures);
    if (!matches) {
      throw new Error(`File content does not match declared type: ${contentType}`);
    }
  }
}

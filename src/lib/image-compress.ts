/**
 * Compresses an image buffer to under 1MB using sharp.
 * Outputs WebP for best size/quality ratio.
 */
import sharp from 'sharp';

const MAX_BYTES = 1024 * 1024;

export async function compressImageUnder1MB(buffer: Buffer): Promise<Buffer> {
  let quality = 80;
  let result = await sharp(buffer)
    .webp({ quality })
    .toBuffer();

  while (result.byteLength > MAX_BYTES && quality > 20) {
    quality -= 15;
    result = await sharp(buffer)
      .webp({ quality })
      .toBuffer();
  }

  if (result.byteLength > MAX_BYTES) {
    result = await sharp(buffer)
      .resize(1024, 1024, { fit: 'inside' })
      .webp({ quality: 60 })
      .toBuffer();
  }

  return result;
}

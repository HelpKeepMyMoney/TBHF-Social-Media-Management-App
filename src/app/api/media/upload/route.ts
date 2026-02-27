import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth/middleware';
import { uploadFile, validateFile } from '@/lib/storage';
import { writeAuditLog } from '@/lib/utils/audit-log';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['admin', 'staff']);
  if (isAuthError(auth)) return auth;

  try {
    const formData    = await req.formData();
    const file        = formData.get('file') as File | null;
    const folderParam = (formData.get('folder') as string | null) ?? 'uploads';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File exceeds 50 MB limit' },
        { status: 400 },
      );
    }

    const contentType = file.type;
    const arrayBuffer = await file.arrayBuffer();
    const buffer      = Buffer.from(arrayBuffer);

    // Validate type and size
    validateFile(buffer, contentType);

    // Sanitize filename
    const ext      = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
    const safeName = `${folderParam}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const result = await uploadFile(buffer, safeName, contentType);

    await writeAuditLog(auth.user.uid, 'media.upload', undefined, {
      filename: safeName,
      size:     file.size,
      provider: result.provider,
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err) {
    console.error('[media/upload]', err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth/middleware';
import { deleteFileByUrl } from '@/lib/storage';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['admin', 'staff']);
  if (isAuthError(auth)) return auth;

  let body: { url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON' },
      { status: 400 },
    );
  }

  const url = body?.url;
  if (!url || typeof url !== 'string') {
    return NextResponse.json(
      { success: false, error: 'URL is required' },
      { status: 400 },
    );
  }

  await deleteFileByUrl(url);
  return NextResponse.json({ success: true });
}

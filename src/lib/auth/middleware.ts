import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase/admin';
import type { AppUser, UserRole } from '@/types';

export interface AuthenticatedContext {
  user: AppUser;
}

/**
 * Verifies the Firebase ID token from the Authorization header.
 * Returns the AppUser if valid, or a 401/403 NextResponse on failure.
 */
export async function requireAuth(
  req: NextRequest,
  allowedRoles?: UserRole[],
): Promise<AuthenticatedContext | NextResponse> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'Missing authorization token' },
      { status: 401 },
    );
  }

  const token = authHeader.slice(7);

  try {
    const adminAuth = getAdminAuth();
    const decoded = await adminAuth.verifyIdToken(token);

    // Fetch role from Firestore
    const db = getAdminFirestore();
    const userDoc = await db.collection('users').doc(decoded.uid).get();

    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User record not found' },
        { status: 403 },
      );
    }

    const userData = userDoc.data()!;
    const user: AppUser = {
      uid:       decoded.uid,
      name:      userData.name ?? decoded.name ?? '',
      email:     userData.email ?? decoded.email ?? '',
      role:      userData.role as UserRole,
      createdAt: userData.createdAt ?? new Date().toISOString(),
    };

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    return { user };
  } catch (err) {
    console.error('[auth] Token verification failed:', err);
    return NextResponse.json(
      { success: false, error: 'Invalid or expired token' },
      { status: 401 },
    );
  }
}

export function isAuthError(
  result: AuthenticatedContext | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse;
}

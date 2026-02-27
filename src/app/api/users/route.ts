import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth/middleware';
import { getAdminFirestore, getAdminAuth } from '@/lib/firebase/admin';
import type { AppUser, UserRole } from '@/types';

// POST /api/users — create Firestore user profile (admin only)
// The Firebase Auth account must already exist. This creates the Firestore record.
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['admin']);
  if (isAuthError(auth)) return auth;

  const body = (await req.json()) as { name: string; email: string; role: UserRole };

  if (!body.name || !body.email || !body.role) {
    return NextResponse.json(
      { success: false, error: 'name, email, and role are required' },
      { status: 400 },
    );
  }

  const validRoles: UserRole[] = ['admin', 'staff', 'board'];
  if (!validRoles.includes(body.role)) {
    return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
  }

  try {
    // Look up the Firebase Auth user by email
    const adminAuth = getAdminAuth();
    const firebaseUser = await adminAuth.getUserByEmail(body.email);

    const db  = getAdminFirestore();
    const now = new Date().toISOString();

    const userData: Omit<AppUser, 'uid'> = {
      name:      body.name.trim(),
      email:     body.email.trim().toLowerCase(),
      role:      body.role,
      createdAt: now,
    };

    await db.collection('users').doc(firebaseUser.uid).set(userData, { merge: true });

    const user: AppUser = { uid: firebaseUser.uid, ...userData };
    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (err) {
    const firebaseErr = err as { code?: string };
    if (firebaseErr.code === 'auth/user-not-found') {
      return NextResponse.json(
        {
          success: false,
          error:
            'No Firebase Auth account found for this email. Ask the user to sign up or use the Firebase console to create their account first.',
        },
        { status: 404 },
      );
    }
    console.error('[api/users]', err);
    return NextResponse.json({ success: false, error: 'Failed to create user profile' }, { status: 500 });
  }
}

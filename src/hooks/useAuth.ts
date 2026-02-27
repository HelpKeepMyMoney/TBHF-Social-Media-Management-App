'use client';

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromCache,
  type FirestoreError,
} from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { getClientAuth, getClientFirestore } from '@/lib/firebase/client';
import type { AppUser } from '@/types';

interface AuthState {
  user: AppUser | null;
  loading: boolean;
  token: string | null;
  networkError: boolean;
}

export function useAuth() {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user:         null,
    loading:      true,
    token:        null,
    networkError: false,
  });

  useEffect(() => {
    const auth = getClientAuth();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setState({ user: null, loading: false, token: null });
        router.push('/login');
        return;
      }

      try {
        const token = await firebaseUser.getIdToken();
        const db = getClientFirestore();
        const userDocRef = doc(db, 'users', firebaseUser.uid);

        let userDoc;
        try {
          userDoc = await getDoc(userDocRef);
        } catch (fetchErr) {
          // Firestore offline — try the local cache as a fallback
          if ((fetchErr as FirestoreError).code === 'unavailable') {
            userDoc = await getDocFromCache(userDocRef);
          } else {
            throw fetchErr;
          }
        }

        if (!userDoc.exists()) {
          // User exists in Auth but not Firestore — sign them out
          await firebaseSignOut(auth);
          setState({ user: null, loading: false, token: null, networkError: false });
          router.push('/login');
          return;
        }

        const data = userDoc.data();
        const user: AppUser = {
          uid:       firebaseUser.uid,
          name:      data.name ?? firebaseUser.displayName ?? '',
          email:     data.email ?? firebaseUser.email ?? '',
          role:      data.role,
          createdAt: data.createdAt ?? new Date().toISOString(),
        };

        setState({ user, loading: false, token, networkError: false });
      } catch (err) {
        if ((err as FirestoreError).code === 'unavailable') {
          // Offline with no cached data — don't redirect to login
          console.warn('[useAuth] Network unavailable and no cached profile.');
          setState({ user: null, loading: false, token: null, networkError: true });
          return;
        }
        console.error('[useAuth] Failed to load user profile:', err);
        setState({ user: null, loading: false, token: null, networkError: false });
      }
    });

    return () => unsubscribe();
  }, [router]);

  const signOut = useCallback(async () => {
    const auth = getClientAuth();
    await firebaseSignOut(auth);
    router.push('/login');
  }, [router]);

  /**
   * Returns fresh ID token for API requests.
   */
  const getToken = useCallback(async (): Promise<string> => {
    const auth = getClientAuth();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not authenticated');
    return currentUser.getIdToken();
  }, []);

  return {
    user:         state.user,
    loading:      state.loading,
    token:        state.token,
    networkError: state.networkError,
    signOut,
    getToken,
    isAdmin: state.user?.role === 'admin',
    isStaff: state.user?.role === 'staff' || state.user?.role === 'admin',
    isBoard: state.user?.role === 'board',
  };
}

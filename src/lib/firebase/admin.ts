/**
 * Firebase Admin SDK — server-side only.
 * Never import this file from client components.
 */
import {
  initializeApp,
  getApps,
  cert,
  type App,
} from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getStorage, type Storage } from 'firebase-admin/storage';

let adminApp: App;

function getAdminApp(): App {
  if (getApps().length === 0) {
    const storageBucket =
      process.env.FIREBASE_STORAGE_BUCKET ??
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
      `${process.env.FIREBASE_PROJECT_ID}.appspot.com`;
    adminApp = initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_PROJECT_ID!,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
        // Replace escaped newlines from env var
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')!,
      }),
      storageBucket,
    });
  } else {
    adminApp = getApps()[0];
  }
  return adminApp;
}

export function getAdminStorage(): Storage {
  return getStorage(getAdminApp());
}

export function getAdminFirestore(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

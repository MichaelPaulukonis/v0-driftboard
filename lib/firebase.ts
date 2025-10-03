import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

function getFirebaseInstances() {
  if (process.env.NODE_ENV === 'test') {
    const { vi } = require('vitest');
    return {
      app: { name: '[DEFAULT]', options: {} },
      auth: {
        currentUser: null,
        onAuthStateChanged: vi.fn(),
        signInWithEmailAndPassword: vi.fn(),
        signOut: vi.fn(),
      },
      db: {
        collection: vi.fn(() => getFirebaseInstances().db),
        doc: vi.fn(() => getFirebaseInstances().db),
        get: vi.fn(() => Promise.resolve({ exists: true, data: () => ({}) })),
        addDoc: vi.fn(),
        updateDoc: vi.fn(),
        deleteDoc: vi.fn(),
        query: vi.fn(() => getFirebaseInstances().db),
        where: vi.fn(() => getFirebaseInstances().db),
        orderBy: vi.fn(() => getFirebaseInstances().db),
        getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
      },
    };
  }

  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(app);
  const db = getFirestore(app);

  return { app, auth, db };
}

const { app, auth, db } = getFirebaseInstances();

export { app, auth, db };

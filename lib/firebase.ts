import { initializeApp, getApps, getApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseInstances() {
  if (process.env.NODE_ENV === "test") {
    // Return mock instances for testing - the actual mocking is handled in vitest.setup.ts
    return {
      app: { name: "[DEFAULT]", options: {} },
      auth: {
        currentUser: null,
        onAuthStateChanged: () => () => {}, // Mock unsubscribe function
        signInWithEmailAndPassword: () => Promise.resolve({}),
        signOut: () => Promise.resolve(),
      },
      db: {
        collection: () => ({}),
        doc: () => ({}),
        get: () => Promise.resolve({ exists: true, data: () => ({}) }),
        addDoc: () => Promise.resolve({}),
        updateDoc: () => Promise.resolve(),
        deleteDoc: () => Promise.resolve(),
        query: () => ({}),
        where: () => ({}),
        orderBy: () => ({}),
        getDocs: () => Promise.resolve({ docs: [] }),
      } as any,
    };
  }

  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  const auth = getAuth(app);
  const db = getFirestore(app);

  // Opt-in: run against local emulators (pnpm emulators) instead of the live project.
  if (process.env.NEXT_PUBLIC_USE_EMULATOR === "true") {
    try {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", {
        disableWarnings: true,
      });
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
    } catch {
      // Already connected (HMR re-evaluates this module).
    }
  }

  return { app, auth, db };
}

const { app, auth, db } = getFirebaseInstances();

export { app, auth, db };

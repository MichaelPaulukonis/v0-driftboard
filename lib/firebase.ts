import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

let app: any;
let auth: any;
let db: any;

if (process.env.NODE_ENV === 'test') {
  const { vi } = await import('vitest');
  // Mock Firebase for testing
  app = {
    name: '[DEFAULT]',
    options: {},
  };
  auth = {
    currentUser: null,
    onAuthStateChanged: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
  };
  db = {
    collection: vi.fn(() => db),
    doc: vi.fn(() => db),
    get: vi.fn(() => Promise.resolve({ exists: true, data: () => ({}) })),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    query: vi.fn(() => db),
    where: vi.fn(() => db),
    orderBy: vi.fn(() => db),
    getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
  };
} else {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  }

  // Check if any required fields are missing
  const requiredFields = ["apiKey", "authDomain", "projectId", "appId"]
  const missingFields = requiredFields.filter((field) => !firebaseConfig[field as keyof typeof firebaseConfig])

  if (missingFields.length > 0) {
    console.error("Missing required Firebase config fields:", missingFields)
    throw new Error(`Missing required Firebase configuration: ${missingFields.join(", ")}`)
  }

  // Initialize Firebase
  app = initializeApp(firebaseConfig)

  // Initialize Firebase Authentication and get a reference to the service
  auth = getAuth(app)

  // Initialize Cloud Firestore and get a reference to the service
  db = getFirestore(app)
}

export { app, auth, db }

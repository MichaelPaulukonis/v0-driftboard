import * as admin from "firebase-admin";

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, "\n"),
        }),
      });
    } catch (error: any) {
      console.error("Firebase admin initialization error", error.stack);
    }
  } else {
    console.warn(
      "Firebase Admin SDK: Missing environment variables. Skipping initialization.",
    );
  }
}

// Export a proxy or mock if app is not initialized to allow build to pass
const isInitialized = !!admin.apps.length;

export const db = isInitialized
  ? admin.firestore()
  : ({} as admin.firestore.Firestore);
export const auth = isInitialized ? admin.auth() : ({} as admin.auth.Auth);

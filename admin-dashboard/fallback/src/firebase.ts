import path from "node:path";
import fs from "node:fs";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore as getDb } from "firebase-admin/firestore";
import type { ServiceAccount } from "firebase-admin";

export function getFirestore() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID is required");
  }
  if (!serviceAccountPath) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is required");
  }

  const resolvedPath = path.resolve(serviceAccountPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Service account file not found at ${resolvedPath}`);
  }

  const serviceAccount = JSON.parse(
    fs.readFileSync(resolvedPath, "utf-8"),
  ) as ServiceAccount;

  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId,
    });
  }

  return getDb();
}

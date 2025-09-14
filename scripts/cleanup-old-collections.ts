import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';

// --- Firebase Admin Initialization ---
const keyPath = path.resolve(process.cwd(), 'scripts/serviceAccountKey.json');
const serviceAccount = require(keyPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore();
const BATCH_SIZE = 400; // Firestore batch limit is 500, use a safe size

// --- Deletion Logic ---
async function deleteCollection(collectionName: string): Promise<number> {
  console.log(`[Cleanup] Starting to delete collection: ${collectionName}`);
  const collectionRef = db.collection(collectionName);
  let deletedCount = 0;

  while (true) {
    const snapshot = await collectionRef.limit(BATCH_SIZE).get();
    if (snapshot.empty) {
      break; // No more documents to delete
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    deletedCount += snapshot.size;
    console.log(`[Cleanup] Deleted a batch of ${snapshot.size} documents from ${collectionName}.`);
  }

  console.log(`[Cleanup] Finished deleting ${deletedCount} documents from ${collectionName}.`);
  return deletedCount;
}

async function runCleanup() {
  console.log('🔵 Starting cleanup of old collections...');
  const collectionsToDelete = ['boards', 'lists', 'cards', 'comments'];
  let totalDeletedCount = 0;

  for (const collectionName of collectionsToDelete) {
    const count = await deleteCollection(collectionName);
    totalDeletedCount += count;
  }

  console.log(`🟢 Cleanup complete. Total documents deleted: ${totalDeletedCount}`);
}

// --- Execute Script ---
console.warn('⚠️ WARNING: This script will permanently delete all documents in the old collections.');
console.warn('Starting in 5 seconds... Press Ctrl+C to cancel.');

setTimeout(() => {
  runCleanup()
    .catch(error => {
      console.error('🔴 Cleanup script failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      console.log('⚫️ Deleting Firebase app to close connections...');
      await admin.app().delete();
      console.log('⚫️ Connections closed. Exiting.');
    });
}, 5000);

import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';

// --- Firebase Admin Initialization ---
// Construct a path to the key file relative to the project root, where the script is run from.
const keyPath = path.resolve(process.cwd(), 'scripts/serviceAccountKey.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require(keyPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore();

// --- Migration Logic ---
async function runDataMigration() {
  console.log('🔵 Starting data migration with Admin privileges...');
  const collectionsToMigrate = ['lists', 'cards', 'comments'];
  let updatedCount = 0;

  for (const collectionName of collectionsToMigrate) {
    try {
      console.log(`[Migration] Checking collection: ${collectionName}`);
      const collectionRef = db.collection(collectionName);
      const snapshot = await collectionRef.get();

      if (snapshot.empty) {
        console.log(`[Migration] Collection ${collectionName} is empty. Skipping.`);
        continue;
      }

      let batch = db.batch();
      let docsInBatch = 0;

      for (const document of snapshot.docs) {
        const data = document.data();

        if (data.status === undefined) {
          batch.update(document.ref, { status: 'active' });
          docsInBatch++;
          updatedCount++;

          if (docsInBatch >= 490) {
            await batch.commit();
            console.log(`[Migration] Committed a batch of ${docsInBatch} updates for ${collectionName}.`);
            batch = db.batch(); // Re-initialize batch
            docsInBatch = 0;
          }
        }
      }

      if (docsInBatch > 0) {
        await batch.commit();
        console.log(`[Migration] Committed final batch of ${docsInBatch} updates for ${collectionName}.`);
      }
    } catch (error) {
        console.error(`🔴 Error processing collection ${collectionName}:`, error);
    }
  }

  console.log(`🟢 Migration complete. Total documents updated: ${updatedCount}`);
}

// --- Execute Script ---
runDataMigration()
  .catch(error => {
    console.error('🔴 Migration script failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    console.log('⚫️ Closing database connection...');
    // Explicitly deleting the app ensures a clean exit for the script.
    await admin.app().delete();
    console.log('⚫️ Connection closed. Exiting.');
  });
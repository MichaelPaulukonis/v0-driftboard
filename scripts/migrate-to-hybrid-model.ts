import * as admin from 'firebase-admin';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import * as path from 'path';

// --- Firebase Admin Initialization ---
const keyPath = path.resolve(process.cwd(), 'scripts/serviceAccountKey.json');
const serviceAccount = require(keyPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore();

// --- Migration Logic ---
async function migrateToHybridModel() {
  console.log('🔵 Starting migration to hybrid data model (_current + history)...');
  const collectionsToMigrate = ['boards', 'lists', 'cards', 'comments'];
  let totalDocsMigrated = 0;

  for (const oldCollectionName of collectionsToMigrate) {
    const newCollectionName = `${oldCollectionName}_current`;
    console.log(`[Migration] Processing ${oldCollectionName} -> ${newCollectionName}`);

    try {
      const oldCollectionRef = db.collection(oldCollectionName);
      const snapshot = await oldCollectionRef.get();

      if (snapshot.empty) {
        console.log(`[Migration] Collection ${oldCollectionName} is empty. Skipping.`);
        continue;
      }

      let batch = db.batch();
      let opsInBatch = 0;

      for (const doc of snapshot.docs) {
        const oldData = doc.data();
        const newCurrentRef = db.collection(newCollectionName).doc(doc.id);
        const historyRef = newCurrentRef.collection('history').doc(); // Auto-generate history ID

        const historyData = {
          changeType: 'create',
          createdAt: oldData.createdAt || Timestamp.now(), // Use existing or fallback
          createdBy: oldData.userId || oldData.createdBy || 'migration',
          snapshot: oldData,
        };

        // Add the two write operations to the batch
        batch.set(newCurrentRef, oldData);
        batch.set(historyRef, historyData);
        opsInBatch += 2;
        totalDocsMigrated++;

        // Commit batch when it's nearly full (500 ops limit)
        if (opsInBatch >= 498) {
          await batch.commit();
          console.log(`[Migration] Committed a batch of ${opsInBatch / 2} documents for ${oldCollectionName}.`);
          batch = db.batch(); // Re-initialize
          opsInBatch = 0;
        }
      }

      // Commit any remaining operations
      if (opsInBatch > 0) {
        await batch.commit();
        console.log(`[Migration] Committed final batch of ${opsInBatch / 2} documents for ${oldCollectionName}.`);
      }

    } catch (error) {
      console.error(`🔴 Error processing collection ${oldCollectionName}:`, error);
    }
  }

  console.log(`🟢 Migration complete. Total documents migrated: ${totalDocsMigrated}`);
}

// --- Execute Script ---
migrateToHybridModel()
  .catch(error => {
    console.error('🔴 Migration script failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    console.log('⚫️ Deleting Firebase app to close connections...');
    await admin.app().delete();
    console.log('⚫️ Connections closed. Exiting.');
  });

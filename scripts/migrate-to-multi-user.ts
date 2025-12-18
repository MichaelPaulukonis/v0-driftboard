import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import * as path from "path";

// --- Firebase Admin Initialization ---
const keyPath = path.resolve(process.cwd(), "scripts/serviceAccountKey.json");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require(keyPath);

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = getFirestore();

// --- Migration Logic ---
async function migrateToMultiUser() {
  console.log("🔵 Starting multi-user migration...");

  const boardsRef = db.collection("boards_current");
  const membershipsRef = db.collection("board_memberships");

  const snapshot = await boardsRef.get();

  if (snapshot.empty) {
    console.log("No boards found.");
    return;
  }

  let batch = db.batch();
  let opCount = 0;
  let migratedBoards = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const boardId = doc.id;
    const userId = data.userId; // The original creator

    if (!userId) {
      console.warn(`Board ${boardId} has no userId. Skipping.`);
      continue;
    }

    // 1. Update Board to include ownerId
    if (!data.ownerId) {
      batch.update(doc.ref, { ownerId: userId });
      opCount++;
    }

    // 2. Create Membership for Owner
    // Check if it exists in the batch? No, Firestore batches don't support read-your-writes.
    // We assume check was done or we use set with merge, but we want to ensure 'role: owner'.
    // Since we are migrating, we can just use set. If it overwrites, it ensures correctness.
    // But to avoid overwriting existing valid memberships (if run multiple times), we could check.
    // Ideally we should check if membership exists.

    // Optimization: Since we are in a loop, we can't await inside efficiently if we want to batch.
    // But for a migration script, consistency is more important than speed.
    // However, let's just use `create` if we want to fail if exists, or `set` to upsert.
    // Let's use `set` with `merge: true` to avoid blowing away other fields if they existed,
    // but we strictly want `role: 'owner'`.

    const membershipId = `${boardId}_${userId}`;
    const membershipRef = membershipsRef.doc(membershipId);

    // We blindly set it because we want to enforce the owner membership.
    // If we run this script twice, it just updates the timestamp, which is fine.
    batch.set(
      membershipRef,
      {
        id: membershipId,
        boardId: boardId,
        userId: userId,
        role: "owner",
        addedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    opCount++;

    migratedBoards++;

    if (opCount >= 400) {
      await batch.commit();
      console.log(`Committed batch of ${opCount} operations.`);
      batch = db.batch();
      opCount = 0;
    }
  }

  if (opCount > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${opCount} operations.`);
  }

  console.log(`🟢 Migration complete. Processed ${migratedBoards} boards.`);
}

// --- Execute Script ---
migrateToMultiUser()
  .catch((error) => {
    console.error("🔴 Migration script failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    console.log("⚫️ Closing database connection...");
    await admin.app().delete();
    console.log("⚫️ Connection closed. Exiting.");
  });

import * as admin from "firebase-admin";
import { ServiceAccount } from "firebase-admin/app";
import { getProfileName } from "../lib/profile";

// Assuming service account key is in the same directory and gitignored
import serviceAccount from "./serviceAccountKey.json";

// One-time seed of profiles/{uid} ({ displayName } only) from existing users/{uid} docs, so
// teammates' names resolve before each person next logs in. Never overwrites an existing
// profile and never copies email. Dry-run unless --apply.

const apply = process.argv.includes("--apply");

async function main() {
  const projectId = (serviceAccount as { project_id: string }).project_id;
  console.log(
    `${apply ? "APPLYING" : "DRY RUN"} profile seed in project: ${projectId}`,
  );

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as ServiceAccount),
    });
  }
  const db = admin.firestore();

  const users = await db.collection("users").get();
  let created = 0;
  for (const u of users.docs) {
    const profileRef = db.collection("profiles").doc(u.id);
    if ((await profileRef.get()).exists) {
      console.log(`  ${u.id}: profile exists, skipping`);
      continue;
    }
    const data = u.data();
    const displayName = getProfileName(data.displayName, data.email);
    console.log(
      `  ${u.id}: ${apply ? "creating" : "would create"} profile { displayName: "${displayName}" }`,
    );
    if (apply) await profileRef.set({ displayName });
    created++;
  }
  console.log(
    `\n${apply ? "Created" : "Would create"} ${created} of ${users.size} profiles.`,
  );
  if (!apply) console.log("Dry run only. Re-run with --apply to write.");
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});

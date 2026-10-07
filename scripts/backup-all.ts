import * as admin from "firebase-admin";
import { ServiceAccount } from "firebase-admin/app";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Assuming service account key is in the same directory and gitignored
import serviceAccount from "./serviceAccountKey.json";

// Whole-database snapshot: every collection, every document, every subcollection (incl. history).
// Read-only. Unlike backup.ts (per-user), this covers shared boards, memberships, users,
// activities and the immutable history trail. Run before any rules/schema/data migration.

interface DocDump {
  id: string;
  data: unknown;
  subcollections?: Record<string, DocDump[]>;
}

// Tag Firestore-specific types so a restore can rebuild them (plain JSON.stringify would flatten them).
function serialize(value: unknown): unknown {
  if (value instanceof admin.firestore.Timestamp) {
    return {
      __type: "timestamp",
      seconds: value.seconds,
      nanoseconds: value.nanoseconds,
    };
  }
  if (value instanceof admin.firestore.GeoPoint) {
    return {
      __type: "geopoint",
      latitude: value.latitude,
      longitude: value.longitude,
    };
  }
  if (value instanceof admin.firestore.DocumentReference) {
    return { __type: "ref", path: value.path };
  }
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, serialize(v)]),
    );
  }
  return value;
}

const counts: Record<string, number> = {};

async function dumpCollection(
  col: admin.firestore.CollectionReference,
): Promise<DocDump[]> {
  const snap = await col.get();
  // Odd path segments are doc IDs; collapse them so subcollections aggregate (e.g. boards_current/{id}/history).
  const key = col.path
    .split("/")
    .map((seg, i) => (i % 2 === 1 ? "{id}" : seg))
    .join("/");
  counts[key] = (counts[key] ?? 0) + snap.size;

  const docs: DocDump[] = [];
  for (const doc of snap.docs) {
    const entry: DocDump = { id: doc.id, data: serialize(doc.data()) };
    const subs = await doc.ref.listCollections();
    if (subs.length > 0) {
      entry.subcollections = {};
      for (const sub of subs) {
        entry.subcollections[sub.id] = await dumpCollection(sub);
      }
    }
    docs.push(entry);
  }
  return docs;
}

async function main() {
  const projectId = (serviceAccount as { project_id: string }).project_id;
  console.log(`Backing up ALL data in project: ${projectId}`);

  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as ServiceAccount),
    });
  }
  const db = admin.firestore();

  const collections: Record<string, DocDump[]> = {};
  for (const col of await db.listCollections()) {
    console.log(`Dumping ${col.id}...`);
    collections[col.id] = await dumpCollection(col);
  }

  const backedUpAt = new Date().toISOString();
  const filename = `backup-all.${projectId}.${backedUpAt.replace(/[:.]/g, "-")}.json`;
  const exportsDir = path.join(process.cwd(), "exports");
  const filePath = path.join(exportsDir, filename);

  await mkdir(exportsDir, { recursive: true });
  await writeFile(
    filePath,
    JSON.stringify({ projectId, backedUpAt, counts, collections }, null, 2),
  );

  console.log("\nDocument counts (collection path -> docs):");
  Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([p, n]) => console.log(`  ${p}: ${n}`));
  console.log(`\nBackup complete: ${filePath}`);
}

main().catch((error) => {
  console.error("Backup failed:", error);
  process.exit(1);
});

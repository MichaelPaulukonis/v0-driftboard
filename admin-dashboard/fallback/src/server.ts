import path from "node:path";
import express from "express";
import dotenv from "dotenv";
import { getFirestore } from "./firebase.js";

dotenv.config();

const port = Number(process.env.PORT || 4000);
const app = express();

app.use(express.static(path.join(process.cwd(), "public")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api/kpi", async (_req, res) => {
  try {
    const db = getFirestore();
    const collections = [
      "users",
      "boards_current",
      "lists_current",
      "cards_current",
      "comments_current",
    ] as const;

    const counts = await Promise.all(
      collections.map(async (col) => {
        try {
          const snap = await db.collection(col).count().get();
          const count = snap.data().count;
          console.log(`${col}: ${count}`);
          return [col, count ?? 0] as const;
        } catch (colErr) {
          console.error(`Error querying ${col}:`, colErr);
          return [col, 0] as const;
        }
      }),
    );

    const result = Object.fromEntries(counts);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load KPIs" });
  }
});

app.listen(port, () => {
  console.log(`Admin dashboard fallback running at http://localhost:${port}`);
});

// Drill-down endpoints for entity details
app.get("/api/users", async (_req, res) => {
  try {
    const db = getFirestore();
    const snap = await db.collection("users").limit(100).get();
    const users = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load users" });
  }
});

app.get("/api/boards", async (_req, res) => {
  try {
    const db = getFirestore();
    const snap = await db
      .collection("boards_current")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
    const boards = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(boards);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load boards" });
  }
});

app.get("/api/lists", async (_req, res) => {
  try {
    const db = getFirestore();
    const snap = await db
      .collection("lists_current")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
    const lists = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(lists);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load lists" });
  }
});

app.get("/api/cards", async (_req, res) => {
  try {
    const db = getFirestore();
    const snap = await db
      .collection("cards_current")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
    const cards = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(cards);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load cards" });
  }
});

app.get("/api/comments", async (_req, res) => {
  try {
    const db = getFirestore();
    const snap = await db
      .collection("comments_current")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
    const comments = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(comments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load comments" });
  }
});

// Helper to extract a usable date from a document
function getDateFromRecord(data: Record<string, unknown>): Date | null {
  const candidate =
    (data.updatedAt as any) ||
    (data.deletedAt as any) ||
    (data.createdAt as any);

  if (!candidate) return null;
  // Firestore Timestamp
  if (candidate._seconds) return new Date(candidate._seconds * 1000);
  // JS Date or ISO string
  const parsed = new Date(candidate as any);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Deleted items by age range (status === deleted, bucketed by updatedAt/deletedAt/createdAt)
app.get("/api/deleted-stats", async (_req, res) => {
  try {
    const db = getFirestore();
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;

    const collections = ["lists_current", "cards_current"] as const;

    const stats = await Promise.all(
      collections.map(async (col) => {
        try {
          // Single where avoids composite index requirements
          const snap = await db
            .collection(col)
            .where("status", "==", "deleted")
            .limit(500)
            .get();

          let recent = 0;
          let medium = 0;
          let old = 0;

          snap.docs.forEach((doc) => {
            const data = doc.data();
            const date = getDateFromRecord(data);
            if (!date) {
              old += 1; // Treat unknown date as old to be safe
              return;
            }
            const ageMs = now - date.getTime();
            if (ageMs <= thirtyDaysMs) {
              recent += 1;
            } else if (ageMs <= sixtyDaysMs) {
              medium += 1;
            } else {
              old += 1;
            }
          });

          return { collection: col, recent, medium, old };
        } catch (colErr) {
          console.error(`Error querying deleted ${col}:`, colErr);
          return { collection: col, recent: 0, medium: 0, old: 0 };
        }
      }),
    );

    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load deleted stats" });
  }
});

// Drill-down for deleted items by age range
app.get("/api/deleted/:collection/:range", async (req, res) => {
  try {
    const db = getFirestore();
    const { collection, range } = req.params;

    if (!["lists_current", "cards_current"].includes(collection)) {
      return res.status(400).json({ error: "Invalid collection" });
    }

    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;

    // Single where to avoid composite index; filter client-side
    const snap = await db
      .collection(collection)
      .where("status", "==", "deleted")
      .limit(500)
      .get();

    const items = snap.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((data) => {
        const date = getDateFromRecord(data as Record<string, unknown>);
        if (!date) return range === "old"; // unknown date -> bucket as old
        const ageMs = now - date.getTime();
        if (range === "recent") return ageMs <= thirtyDaysMs;
        if (range === "medium")
          return ageMs > thirtyDaysMs && ageMs <= sixtyDaysMs;
        if (range === "old") return ageMs > sixtyDaysMs;
        return false;
      })
      .sort((a, b) => {
        const dateA =
          getDateFromRecord(a as Record<string, unknown>)?.getTime() ?? 0;
        const dateB =
          getDateFromRecord(b as Record<string, unknown>)?.getTime() ?? 0;
        return dateB - dateA; // newest first
      })
      .slice(0, 100);

    res.json(items);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: `Failed to load deleted ${req.params.collection}` });
  }
});

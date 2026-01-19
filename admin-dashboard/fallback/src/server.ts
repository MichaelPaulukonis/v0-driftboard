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

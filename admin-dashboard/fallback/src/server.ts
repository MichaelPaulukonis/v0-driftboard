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

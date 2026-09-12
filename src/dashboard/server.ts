import express from "express";
import * as path from "path";
import { now } from "../clock";
import { loadState } from "../state";

const app = express();
const PORT = 3000;

app.get("/", (_req, res) => {
  res.sendFile(path.join(process.cwd(), "src", "dashboard", "index.html"));
});

app.get("/api/state", (_req, res) => {
  const state = loadState();
  res.json({
    ...state,
    nowISO: now().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`dashboard on http://localhost:${PORT}`);
});

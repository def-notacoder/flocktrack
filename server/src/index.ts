import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "./lib/prisma.js";
import { ensurePoultryPresets } from "./lib/ensure-poultry-presets.js";
import { errorHandler } from "./middleware/error.js";
import { poultryPresetsRouter } from "./routes/poultry-presets.js";
import { hatchesRouter } from "./routes/hatches.js";
import { hatchEggsRouter } from "./routes/hatch-eggs.js";
import { hatchEggLogsRouter } from "./routes/hatch-egg-logs.js";
import { hatchEggHatchingLogsRouter } from "./routes/hatch-egg-hatching-logs.js";
import { hatchEggNotesRouter } from "./routes/hatch-egg-notes.js";
import { chickensRouter } from "./routes/chickens.js";
import { healthRecordsRouter } from "./routes/health-records.js";
import { layingRecordsRouter } from "./routes/laying-records.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { remindersRouter } from "./routes/reminders.js";
import { profileRouter } from "./routes/profile.js";
import { MAX_JSON_BODY_MB } from "./lib/photos.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json({ limit: `${MAX_JSON_BODY_MB}mb` }));

const uploadsDir = path.join(__dirname, "../uploads");
app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: true });
  } catch {
    res.status(503).json({ ok: false, db: false });
  }
});

app.use("/api/poultry-presets", poultryPresetsRouter);
app.use("/api/hatches", hatchesRouter);
app.use("/api/hatches/:id/eggs", hatchEggsRouter);
app.use("/api/hatches/:id/eggs", hatchEggLogsRouter);
app.use("/api/hatches/:id/eggs", hatchEggHatchingLogsRouter);
app.use("/api/hatches/:id/eggs", hatchEggNotesRouter);
app.use("/api/chickens", chickensRouter);
app.use("/api/health-records", healthRecordsRouter);
app.use("/api/laying-records", layingRecordsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/reminders", remindersRouter);
app.use("/api/profile", profileRouter);

const clientDist = path.join(__dirname, "../../client/dist");
app.use(express.static(clientDist));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) res.status(404).json({ error: "Not found" });
  });
});

app.use(errorHandler);

async function start() {
  await ensurePoultryPresets();
  app.listen(PORT, () => {
    console.log(`Flock Log API http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});

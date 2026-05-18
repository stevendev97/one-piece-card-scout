import "dotenv/config";
import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import buyListRouter from "./routes/buyList.js";
import cardsRouter from "./routes/cards.js";
import scanCardRouter from "./routes/scanCard.js";
import tcgplayerRouter from "./routes/tcgplayer.js";

const app = express();
const port = Number(process.env.PORT || 3001);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors());
app.use(express.json({ limit: "12mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "one-piece-card-scout" });
});

app.use("/api/tcgplayer", tcgplayerRouter);
app.use("/api/cards", cardsRouter);
app.use("/api/buy-list", buyListRouter);
app.use("/api/scan-card", scanCardRouter);

app.use(express.static(path.join(__dirname, "..", "dist")));
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "dist", "index.html"));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: error.message || "Unexpected server error." });
});

app.listen(port, () => {
  console.log(`One Piece Card Scout API running on http://localhost:${port}`);
});

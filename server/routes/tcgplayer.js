import { Router } from "express";
import { detectCardCode } from "../services/cardCode.js";
import { hasTcgplayerCredentials, searchProducts } from "../services/tcgplayer.js";

const router = Router();

router.get("/search", async (req, res, next) => {
  try {
    const name = String(req.query.name || "").trim();
    const cardCode = detectCardCode(String(req.query.cardCode || name));

    if (!name && !cardCode) {
      return res.status(400).json({ error: "Provide name or cardCode." });
    }

    if (!hasTcgplayerCredentials()) {
      return res.status(200).json({
        configured: false,
        results: [],
        message: "TCGplayer credentials are not configured yet. Add them to .env on the backend."
      });
    }

    const results = await searchProducts({ name, cardCode });
    return res.json({ configured: true, cardCode, results });
  } catch (error) {
    next(error);
  }
});

export default router;

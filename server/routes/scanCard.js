import { Router } from "express";
import { detectCardCode } from "../services/cardCode.js";

const router = Router();

router.post("/", async (req, res) => {
  const rawText = String(req.body.rawText || "");
  res.status(501).json({
    rawText,
    detectedCardCode: detectCardCode(rawText),
    detectedName: "",
    confidence: 0,
    message: "OCR scanning is the next milestone. Manual search and TCGplayer price tracking are implemented first."
  });
});

export default router;

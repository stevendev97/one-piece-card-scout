import { Router } from "express";
import { getDb, ObjectId } from "../db/mongo.js";
import { detectCardCode, normalizeCardCode } from "../services/cardCode.js";
import { getProductPricing, summarizePricing } from "../services/tcgplayer.js";

const router = Router();
const PRICE_TTL_MS = 18 * 60 * 60 * 1000;

router.get("/", async (_req, res, next) => {
  try {
    const db = await getDb();
    const cards = await db.collection("onePieceCards").find({}).sort({ updatedAt: -1 }).toArray();
    res.json({ cards });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const db = await getDb();
    const cardCode = normalizeCardCode(req.body.cardCode || detectCardCode(req.body.name || ""));
    const now = new Date();
    const card = {
      cardCode,
      name: String(req.body.name || "").trim(),
      setName: String(req.body.setName || "").trim(),
      rarity: String(req.body.rarity || "").trim(),
      color: String(req.body.color || "").trim(),
      type: String(req.body.type || "").trim(),
      imageUrl: String(req.body.imageUrl || "").trim(),
      possibleTcgplayerNames: req.body.possibleTcgplayerNames || [],
      tcgplayerProductId: req.body.tcgplayerProductId ? Number(req.body.tcgplayerProductId) : null,
      updatedAt: now
    };

    if (!card.cardCode && !card.name) {
      return res.status(400).json({ error: "Card code or name is required." });
    }

    const filter = card.cardCode ? { cardCode: card.cardCode } : { name: card.name };
    const result = await db.collection("onePieceCards").findOneAndUpdate(
      filter,
      { $set: card, $setOnInsert: { createdAt: now } },
      { upsert: true, returnDocument: "after" }
    );

    res.status(201).json({ card: result });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/price", async (req, res, next) => {
  try {
    const db = await getDb();
    const card = await db.collection("onePieceCards").findOne({ _id: new ObjectId(req.params.id) });
    if (!card) return res.status(404).json({ error: "Card not found." });
    if (!card.tcgplayerProductId) return res.status(400).json({ error: "Card does not have a TCGplayer product id yet." });

    const cached = await db.collection("priceSnapshots").findOne(
      {
        cardId: card._id,
        updatedAt: { $gte: new Date(Date.now() - PRICE_TTL_MS) }
      },
      { sort: { updatedAt: -1 } }
    );

    if (cached) return res.json({ cached: true, price: cached });

    const pricing = summarizePricing(await getProductPricing(card.tcgplayerProductId));
    const price = {
      cardId: card._id,
      tcgplayerProductId: card.tcgplayerProductId,
      ...pricing,
      updatedAt: new Date()
    };
    await db.collection("priceSnapshots").insertOne(price);
    res.json({ cached: false, price });
  } catch (error) {
    next(error);
  }
});

export default router;

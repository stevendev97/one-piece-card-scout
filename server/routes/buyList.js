import { Router } from "express";
import { getDb, ObjectId } from "../db/mongo.js";
import { normalizeCardCode } from "../services/cardCode.js";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const db = await getDb();
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.priority) filter.priority = req.query.priority;
    const items = await db.collection("buyList").find(filter).sort({ priority: 1, updatedAt: -1 }).toArray();
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const db = await getDb();
    const now = new Date();
    const item = {
      cardName: String(req.body.cardName || "").trim(),
      cardCode: normalizeCardCode(req.body.cardCode || ""),
      imageUrl: String(req.body.imageUrl || "").trim(),
      marketPrice: toNumber(req.body.marketPrice),
      targetBuyPrice: toNumber(req.body.targetBuyPrice),
      maxBuyPrice: toNumber(req.body.maxBuyPrice),
      priority: req.body.priority || "Medium",
      notes: String(req.body.notes || "").trim(),
      ownedQuantity: toNumber(req.body.ownedQuantity) || 0,
      wantedQuantity: toNumber(req.body.wantedQuantity) || 1,
      status: req.body.status || "Looking",
      setName: String(req.body.setName || "").trim(),
      character: String(req.body.character || "").trim(),
      rarity: String(req.body.rarity || "").trim(),
      createdAt: now,
      updatedAt: now
    };

    if (!item.cardName && !item.cardCode) {
      return res.status(400).json({ error: "Card name or card code is required." });
    }

    const result = await db.collection("buyList").insertOne(item);
    res.status(201).json({ item: { ...item, _id: result.insertedId } });
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const db = await getDb();
    const patch = { ...req.body, updatedAt: new Date() };
    delete patch._id;
    const result = await db.collection("buyList").findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      { $set: patch },
      { returnDocument: "after" }
    );
    res.json({ item: result });
  } catch (error) {
    next(error);
  }
});

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export default router;

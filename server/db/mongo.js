import { MongoClient, ObjectId } from "mongodb";

let client;
let db;

export { ObjectId };

export async function getDb() {
  if (db) return db;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is required. Copy .env.example to .env and add your MongoDB Atlas connection string.");
  }

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(process.env.MONGODB_DB || "one_piece_card_scout");
  await ensureIndexes(db);
  return db;
}

async function ensureIndexes(database) {
  await Promise.all([
    database.collection("onePieceCards").createIndex({ cardCode: 1 }, { unique: true, sparse: true }),
    database.collection("onePieceCards").createIndex({ name: "text", cardCode: "text", setName: "text" }),
    database.collection("priceSnapshots").createIndex({ cardId: 1, updatedAt: -1 }),
    database.collection("buyList").createIndex({ status: 1, priority: 1 }),
    database.collection("correctionHistory").createIndex({ cardCode: 1, createdAt: -1 })
  ]);
}

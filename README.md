# One Piece Card Scout

A One Piece TCG scanner and price tracker web app. This version pivots to the production architecture:

- React + Vite frontend
- Node.js + Express backend
- MongoDB Atlas persistence
- TCGplayer API product matching and price caching
- Google Vision OCR next, with Tesseract.js fallback later

## Current Milestone

Per the build plan, the first milestone is manual search and TCGplayer price tracking:

- Search TCGplayer products by One Piece card code and/or card name.
- Confirm the exact TCGplayer product before saving.
- Save One Piece cards to MongoDB in the `onePieceCards` collection.
- Store `tcgplayerProductId` after confirmation.
- Fetch and cache price snapshots for 18 hours in `priceSnapshots`.
- Manage a card-show buy list in `buyList`.
- Keep `/api/scan-card` as the placeholder for the OCR milestone.

## Setup

1. Install dependencies:

```powershell
npm install
```

2. Copy `.env.example` to `.env`.

3. Add your MongoDB Atlas connection string:

```text
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB=one_piece_card_scout
```

4. Add TCGplayer API credentials:

```text
TCGPLAYER_CLIENT_ID=...
TCGPLAYER_CLIENT_SECRET=...
TCGPLAYER_ONE_PIECE_CATEGORY_ID=...
```

Keep TCGplayer credentials on the backend only. Never put them in React browser code.

## Run locally

```powershell
npm run dev
```

Open:

```text
http://localhost:5173
```

The backend runs on:

```text
http://localhost:3001
```

## API Routes

- `GET /api/health`
- `GET /api/tcgplayer/search?name=&cardCode=`
- `GET /api/cards`
- `POST /api/cards`
- `GET /api/cards/:id/price`
- `GET /api/buy-list`
- `POST /api/buy-list`
- `PATCH /api/buy-list/:id`
- `POST /api/scan-card`

## OCR Next Step

The next milestone is `ScanCardPage`:

- Browser camera capture
- Full-card guide overlay
- Image preprocessing
- Backend Google Vision OCR
- Tesseract.js fallback
- Return three candidate matches with confidence
- Require confirmation before saving

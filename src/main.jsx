import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
}

if ("caches" in window) {
  caches.keys().then((keys) => {
    keys.forEach((key) => caches.delete(key));
  });
}

const tabs = [
  { id: "search", label: "Search" },
  { id: "collection", label: "Collection" },
  { id: "buyList", label: "Buy List" },
  { id: "scan", label: "Scanner" }
];

function App() {
  const [activeTab, setActiveTab] = useState("search");
  const [savedTick, setSavedTick] = useState(0);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">One Piece TCG</p>
          <h1>Card Scout</h1>
        </div>
        <nav aria-label="Primary">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? "active" : ""}
              type="button"
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main>
        {activeTab === "search" && <ManualSearchPage onSaved={() => setSavedTick((value) => value + 1)} />}
        {activeTab === "collection" && <CollectionPage refreshKey={savedTick} />}
        {activeTab === "buyList" && <BuyListPage />}
        {activeTab === "scan" && <ScanCardPage />}
      </main>
    </div>
  );
}

function ManualSearchPage({ onSaved }) {
  const [query, setQuery] = useState("");
  const [cardCode, setCardCode] = useState("");
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [manualCard, setManualCard] = useState({ name: "", setName: "", rarity: "" });

  async function searchProducts(event) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("Searching TCGplayer products...");
    setResults([]);
    setSelected(null);

    try {
      const params = new URLSearchParams({ name: query, cardCode });
      const data = await api(`/api/tcgplayer/search?${params.toString()}`);
      if (!data.configured) {
        setMessage(data.message);
        return;
      }
      setResults(data.results || []);
      setMessage(data.results?.length ? "Choose the closest product match before saving." : "No products found. Try card code plus card name.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveCard() {
    const product = selected;
    const payload = {
      cardCode,
      name: manualCard.name || product?.name || query,
      setName: manualCard.setName,
      rarity: manualCard.rarity,
      possibleTcgplayerNames: product?.name ? [product.name] : [],
      tcgplayerProductId: product?.productId || null,
      imageUrl: product?.imageUrl || ""
    };

    setIsLoading(true);
    setMessage("Saving card...");
    try {
      const data = await api("/api/cards", { method: "POST", body: payload });
      setMessage(`Saved ${data.card.name || data.card.cardCode}.`);
      onSaved();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="page-grid">
      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>Manual Search</h2>
            <p>Start here: type a One Piece card code or card name, then confirm the exact TCGplayer product.</p>
          </div>
        </div>

        <form className="form-grid" onSubmit={searchProducts}>
          <label>
            Card code
            <input value={cardCode} onChange={(event) => setCardCode(event.target.value)} placeholder="OP05-060" />
          </label>
          <label>
            Card name
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Monkey.D.Luffy" />
          </label>
          <button type="submit" disabled={isLoading}>
            Search TCGplayer
          </button>
        </form>

        {message && <p className="message">{message}</p>}

        <div className="results-list">
          {results.slice(0, 12).map((product) => (
            <button
              key={product.productId}
              className={selected?.productId === product.productId ? "result-card selected" : "result-card"}
              type="button"
              onClick={() => {
                setSelected(product);
                setManualCard((current) => ({ ...current, name: product.name || current.name }));
              }}
            >
              {product.imageUrl && <img src={product.imageUrl} alt="" />}
              <span>
                <strong>{product.name}</strong>
                <small>Product ID {product.productId}</small>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2>Confirm Card</h2>
        <div className="form-grid">
          <label>
            Saved name
            <input value={manualCard.name} onChange={(event) => setManualCard({ ...manualCard, name: event.target.value })} placeholder="Required if no product selected" />
          </label>
          <label>
            Set
            <input value={manualCard.setName} onChange={(event) => setManualCard({ ...manualCard, setName: event.target.value })} placeholder="Pillars of Strength" />
          </label>
          <label>
            Rarity
            <input value={manualCard.rarity} onChange={(event) => setManualCard({ ...manualCard, rarity: event.target.value })} placeholder="SR" />
          </label>
          <button type="button" onClick={saveCard} disabled={isLoading || (!selected && !manualCard.name && !cardCode)}>
            Save to Collection
          </button>
        </div>
        <p className="muted">Saving the product ID once lets the backend cache price updates for 18 hours instead of calling TCGplayer on every page load.</p>
      </div>
    </section>
  );
}

function CollectionPage({ refreshKey }) {
  const [cards, setCards] = useState([]);
  const [prices, setPrices] = useState({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    api("/api/cards")
      .then((data) => setCards(data.cards || []))
      .catch((error) => setMessage(error.message));
  }, [refreshKey]);

  async function updatePrice(card) {
    setMessage(`Updating ${card.name || card.cardCode}...`);
    try {
      const data = await api(`/api/cards/${card._id}/price`);
      setPrices((current) => ({ ...current, [card._id]: data.price }));
      setMessage(data.cached ? "Loaded cached price." : "Fetched fresh TCGplayer price.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  const totalValue = useMemo(() => {
    return cards.reduce((sum, card) => sum + Number(prices[card._id]?.marketPrice || 0), 0);
  }, [cards, prices]);

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Collection</h2>
          <p>Saved One Piece cards with cached TCGplayer pricing.</p>
        </div>
        <strong>{money(totalValue)}</strong>
      </div>
      {message && <p className="message">{message}</p>}
      <div className="table-list">
        {cards.map((card) => (
          <article className="table-row" key={card._id}>
            {card.imageUrl ? <img src={card.imageUrl} alt="" /> : <div className="image-placeholder" />}
            <div>
              <strong>{card.name || "Unnamed card"}</strong>
              <p>{[card.cardCode, card.setName, card.rarity].filter(Boolean).join(" - ")}</p>
            </div>
            <span>{money(prices[card._id]?.marketPrice)}</span>
            <button type="button" disabled={!card.tcgplayerProductId} onClick={() => updatePrice(card)}>
              Update price
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function BuyListPage() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("All");
  const [form, setForm] = useState({
    cardName: "",
    cardCode: "",
    targetBuyPrice: "",
    maxBuyPrice: "",
    priority: "High",
    wantedQuantity: 1,
    notes: "",
    status: "Looking"
  });

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    const data = await api("/api/buy-list");
    setItems(data.items || []);
  }

  async function addItem(event) {
    event.preventDefault();
    await api("/api/buy-list", { method: "POST", body: form });
    setForm({ ...form, cardName: "", cardCode: "", notes: "" });
    await loadItems();
  }

  async function updateStatus(item, status) {
    await api(`/api/buy-list/${item._id}`, { method: "PATCH", body: { status } });
    await loadItems();
  }

  const visibleItems = items.filter((item) => {
    if (filter === "High") return item.priority === "High";
    if (filter === "UnderTarget") return Number(item.marketPrice || 0) <= Number(item.targetBuyPrice || 0);
    return true;
  });

  return (
    <section className="page-grid">
      <div className="panel">
        <h2>Add Hunt Card</h2>
        <form className="form-grid" onSubmit={addItem}>
          <label>
            Card name
            <input value={form.cardName} onChange={(event) => setForm({ ...form, cardName: event.target.value })} />
          </label>
          <label>
            Card code
            <input value={form.cardCode} onChange={(event) => setForm({ ...form, cardCode: event.target.value })} placeholder="OP05-060" />
          </label>
          <label>
            Target buy price
            <input inputMode="decimal" value={form.targetBuyPrice} onChange={(event) => setForm({ ...form, targetBuyPrice: event.target.value })} />
          </label>
          <label>
            Max buy price
            <input inputMode="decimal" value={form.maxBuyPrice} onChange={(event) => setForm({ ...form, maxBuyPrice: event.target.value })} />
          </label>
          <label>
            Priority
            <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
          </label>
          <label>
            Notes
            <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>
          <button type="submit">Add to Buy List</button>
        </form>
      </div>

      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>Card Show Buy List</h2>
            <p>Filter fast while walking tables.</p>
          </div>
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="All">All</option>
            <option value="High">High priority</option>
            <option value="UnderTarget">Under target</option>
          </select>
        </div>
        <div className="table-list">
          {visibleItems.map((item) => (
            <article className="buy-card" key={item._id}>
              <div>
                <strong>{item.cardName || item.cardCode}</strong>
                <p>{[item.cardCode, item.priority, item.status].filter(Boolean).join(" - ")}</p>
                <small>{item.notes}</small>
              </div>
              <div>
                <span>Target {money(item.targetBuyPrice)}</span>
                <span>Max {money(item.maxBuyPrice)}</span>
              </div>
              <div className="button-row">
                <button type="button" onClick={() => updateStatus(item, "Bought")}>Bought</button>
                <button type="button" onClick={() => updateStatus(item, "Skip")}>Skip</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ScanCardPage() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [status, setStatus] = useState("Ready");
  const [capturedImage, setCapturedImage] = useState("");
  const [scanResult, setScanResult] = useState(null);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  async function startCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("Camera is blocked. Open this app on HTTPS or localhost.");
      return;
    }

    try {
      setStatus("Requesting camera...");
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 1920 }
        },
        audio: false
      });
      setStream(nextStream);
      videoRef.current.srcObject = nextStream;
      await videoRef.current.play();
      setStatus("Camera ready");
    } catch (error) {
      setStatus("Camera permission was denied or unavailable.");
    }
  }

  function stopCamera() {
    stream?.getTracks().forEach((track) => track.stop());
    setStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("Camera stopped");
  }

  async function captureCard() {
    if (!videoRef.current?.videoWidth) return;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    const maxSide = 1200;
    const scale = Math.min(1, maxSide / Math.max(videoRef.current.videoWidth, videoRef.current.videoHeight));
    canvas.width = Math.round(videoRef.current.videoWidth * scale);
    canvas.height = Math.round(videoRef.current.videoHeight * scale);
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const image = canvas.toDataURL("image/jpeg", 0.72);
    setCapturedImage(image);
    setStatus("Captured");

    const data = await api("/api/scan-card", {
      method: "POST",
      body: { imageBase64: image }
    }).catch((error) => ({
      message: "Image captured, but OCR request failed.",
      error: error.message,
      nextStep: "Check the Netlify function log or Google Vision API billing/key settings."
    }));
    setScanResult(data);
  }

  return (
    <section className="page-grid">
      <div className="panel">
        <div className="panel-heading">
          <div>
            <h2>Scanner</h2>
            <p>Open this page on your phone, start the camera, and place the full card inside the guide.</p>
          </div>
          <strong>{status}</strong>
        </div>

        <div className="camera-stage">
          <video ref={videoRef} playsInline muted />
          <div className="card-outline">
            <span>Place card here</span>
          </div>
        </div>
        <canvas ref={canvasRef} hidden />

        <div className="button-row scanner-actions">
          <button type="button" onClick={startCamera} disabled={Boolean(stream)}>
            Start camera
          </button>
          <button type="button" onClick={captureCard} disabled={!stream}>
            Capture
          </button>
          <button type="button" onClick={stopCamera} disabled={!stream}>
            Stop
          </button>
        </div>
      </div>

      <div className="panel">
        <h2>Captured Card</h2>
        {capturedImage ? <img className="capture-preview" src={capturedImage} alt="Captured card" /> : <p className="muted">No image captured yet.</p>}
        {scanResult && (
          <pre className="scan-json">
            {JSON.stringify(scanResult, null, 2)}
          </pre>
        )}
      </div>
    </section>
  );
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.message || "Request failed.");
  return data;
}

function money(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "--";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(number);
}

createRoot(document.getElementById("root")).render(<App />);

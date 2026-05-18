const TCGPLAYER_BASE = "https://api.tcgplayer.com";

let tokenCache = {
  accessToken: "",
  expiresAt: 0
};

export function hasTcgplayerCredentials() {
  return Boolean(process.env.TCGPLAYER_CLIENT_ID && process.env.TCGPLAYER_CLIENT_SECRET);
}

async function getAccessToken() {
  if (tokenCache.accessToken && tokenCache.expiresAt > Date.now() + 60_000) {
    return tokenCache.accessToken;
  }

  if (!hasTcgplayerCredentials()) {
    throw new Error("TCGplayer credentials are not configured.");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.TCGPLAYER_CLIENT_ID,
    client_secret: process.env.TCGPLAYER_CLIENT_SECRET
  });

  const response = await fetch(`${TCGPLAYER_BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    throw new Error(`TCGplayer token request failed: ${response.status}`);
  }

  const data = await response.json();
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000
  };
  return tokenCache.accessToken;
}

async function tcgFetch(path) {
  const token = await getAccessToken();
  const response = await fetch(`${TCGPLAYER_BASE}${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`TCGplayer request failed: ${response.status}`);
  }

  return response.json();
}

export async function searchProducts({ name, cardCode }) {
  const query = new URLSearchParams({
    productName: [cardCode, name].filter(Boolean).join(" "),
    productTypes: "Cards",
    getExtendedFields: "true",
    includeSkus: "true",
    limit: "20"
  });

  if (process.env.TCGPLAYER_ONE_PIECE_CATEGORY_ID) {
    query.set("categoryId", process.env.TCGPLAYER_ONE_PIECE_CATEGORY_ID);
  }

  const data = await tcgFetch(`/catalog/products?${query.toString()}`);
  return data.results || data;
}

export async function getProductPricing(productId) {
  const data = await tcgFetch(`/pricing/product/${encodeURIComponent(productId)}`);
  return data.results || data;
}

export function summarizePricing(results = []) {
  const rows = Array.isArray(results) ? results : [];
  const row = rows.find((item) => item.marketPrice || item.lowPrice) || rows[0] || {};
  return {
    marketPrice: row.marketPrice ?? null,
    lowPrice: row.lowPrice ?? null,
    midPrice: row.midPrice ?? null,
    highPrice: row.highPrice ?? null,
    subTypeName: row.subTypeName ?? "",
    productConditionId: row.productConditionId ?? null
  };
}

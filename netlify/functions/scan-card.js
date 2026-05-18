const CARD_CODE_PATTERN = /\b(OP|ST|EB|PRB|P)\s*-?\s*(\d{2,3})\s*-?\s*(\d{3})\b/i;

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed." });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const imageBase64 = String(body.imageBase64 || "");
    const rawTextFromClient = String(body.rawText || "");

    let rawText = rawTextFromClient;
    let ocrProvider = rawText ? "client" : "none";

    if (!rawText && imageBase64 && process.env.GOOGLE_VISION_API_KEY) {
      rawText = await readWithGoogleVision(imageBase64, process.env.GOOGLE_VISION_API_KEY);
      ocrProvider = "google-vision";
    }

    const detectedCardCode = detectCardCode(rawText);

    return json(200, {
      rawText,
      detectedCardCode,
      detectedName: guessName(rawText, detectedCardCode),
      confidence: detectedCardCode ? 0.82 : 0.15,
      provider: ocrProvider,
      candidates: detectedCardCode
        ? [
            { cardCode: detectedCardCode, confidence: 0.82 },
            { cardCode: detectedCardCode.replace("-", " "), confidence: 0.55 },
            { cardCode: detectedCardCode.split("-")[0], confidence: 0.25 }
          ]
        : [],
      message: process.env.GOOGLE_VISION_API_KEY
        ? "Scan complete."
        : "Image received. Add GOOGLE_VISION_API_KEY in Netlify environment variables to enable OCR."
    });
  } catch (error) {
    return json(500, { error: error.message || "Scan failed." });
  }
}

async function readWithGoogleVision(imageBase64, apiKey) {
  const base64Content = imageBase64.includes(",") ? imageBase64.split(",").pop() : imageBase64;
  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      requests: [
        {
          image: { content: base64Content },
          features: [{ type: "TEXT_DETECTION", maxResults: 5 }]
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google Vision OCR failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.responses?.[0]?.fullTextAnnotation?.text || data.responses?.[0]?.textAnnotations?.[0]?.description || "";
}

function detectCardCode(text = "") {
  const cleaned = String(text)
    .toUpperCase()
    .replace(/[–—_]/g, "-")
    .replace(/O(?=\d)/g, "0");
  const match = cleaned.match(CARD_CODE_PATTERN);
  if (!match) return "";
  return `${match[1].toUpperCase()}${match[2]}-${match[3]}`;
}

function guessName(rawText, cardCode) {
  return String(rawText)
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => line && line !== cardCode && !CARD_CODE_PATTERN.test(line))
    .sort((a, b) => b.length - a.length)[0] || "";
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(body)
  };
}

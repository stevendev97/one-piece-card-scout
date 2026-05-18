export function normalizeCardCode(value = "") {
  const cleaned = String(value)
    .toUpperCase()
    .replace(/[［\[\(]/g, " ")
    .replace(/[］\]\)]/g, " ")
    .replace(/[–—_]/g, "-")
    .replace(/\s+/g, "")
    .replace(/O(?=\d)/g, "0");

  const match = cleaned.match(/\b(OP|ST|EB|PRB|P)-?(\d{2,3})-?(\d{3})\b/);
  if (!match) return "";

  const [, prefix, setNumber, cardNumber] = match;
  return `${prefix}${setNumber}-${cardNumber}`;
}

export function detectCardCode(rawText = "") {
  const direct = normalizeCardCode(rawText);
  if (direct) return direct;

  const spaced = String(rawText).replace(/\s+/g, " ");
  const match = spaced.match(/\b(OP|ST|EB|PRB|P)\s*-?\s*(\d{2,3})\s*-?\s*(\d{3})\b/i);
  return match ? normalizeCardCode(match[0]) : "";
}

export function cardSearchTerms(name = "", cardCode = "") {
  return [cardCode, name, "One Piece"].filter(Boolean).join(" ").trim();
}

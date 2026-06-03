function stripCodeFence(text: string) {
  const fencedMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fencedMatch ? fencedMatch[1] : text;
}

function normalizePastedCharacters(text: string) {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/[\u201c\u201d\u301d\u301e\u3003]/g, '"')
    .replace(/[\u2018\u2019]/g, "'");
}

function extractFirstJsonObject(text: string) {
  const start = text.indexOf("{");

  if (start < 0) {
    return text.trim();
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = inString;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      depth += 1;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return text.slice(start, index + 1).trim();
      }
    }
  }

  return text.slice(start).trim();
}

export function normalizeJsonInput(text: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    return "";
  }

  const unfenced = stripCodeFence(trimmed);
  const normalized = normalizePastedCharacters(unfenced).trim();

  return extractFirstJsonObject(normalized);
}

function stripCodeFence(text: string) {
  const fencedMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fencedMatch ? fencedMatch[1] : text;
}

function normalizePastedCharacters(text: string) {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/[\u2018\u2019]/g, "'");
}

function normalizeSmartQuotedJson(text: string) {
  let normalized = "";
  let inString = false;
  let escaped = false;

  const structuralMap: Record<string, string> = {
    "\uff5b": "{",
    "\uff5d": "}",
    "\uff3b": "[",
    "\uff3d": "]",
    "\uff1a": ":",
    "\uff0c": ",",
  };
  const quoteChars = new Set(['"', "\u201c", "\u201d", "\u301d", "\u301e", "\u3003"]);
  const closingFollowers = new Set([":", ",", "}", "]"]);

  function isClosingQuote(index: number) {
    for (let nextIndex = index + 1; nextIndex < text.length; nextIndex += 1) {
      const nextChar = structuralMap[text[nextIndex]] ?? text[nextIndex];

      if (/\s/.test(nextChar)) {
        continue;
      }

      return closingFollowers.has(nextChar);
    }

    return true;
  }

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (escaped) {
      normalized += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      normalized += char;
      escaped = inString;
      continue;
    }

    if (quoteChars.has(char)) {
      if (!inString) {
        normalized += '"';
        inString = true;
        continue;
      }

      if (isClosingQuote(index)) {
        normalized += '"';
        inString = false;
        continue;
      }

      normalized += char;
      continue;
    }

    normalized += inString ? char : structuralMap[char] ?? char;
  }

  return normalized;
}

function escapeLiteralLineBreaksInStrings(text: string) {
  let normalized = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (escaped) {
      normalized += char;
      escaped = false;
      continue;
    }

    if (char === "\\") {
      normalized += char;
      escaped = inString;
      continue;
    }

    if (char === '"') {
      normalized += char;
      inString = !inString;
      continue;
    }

    if (inString && char === "\r") {
      normalized += "\\n";

      if (text[index + 1] === "\n") {
        index += 1;
      }

      continue;
    }

    if (inString && char === "\n") {
      normalized += "\\n";
      continue;
    }

    if (inString && char === "\t") {
      normalized += "\\t";
      continue;
    }

    normalized += char;
  }

  return normalized;
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
  const normalized = escapeLiteralLineBreaksInStrings(
    normalizeSmartQuotedJson(normalizePastedCharacters(unfenced)),
  ).trim();

  return extractFirstJsonObject(normalized);
}

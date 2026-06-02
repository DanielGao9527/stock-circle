export type NormalizedUrlResult = {
  value: string | null;
  hadInput: boolean;
  wasCleaned: boolean;
};

const URL_PATTERN = /https?:\/\/[^\s<>"'`)\]}]+/i;
const MARKDOWN_LINK_PATTERN = /\[[\s\S]*?\]\((https?:\/\/[\s\S]*?)\)/i;

function toSingleLineText(value: string) {
  return value.replace(/\r\n/g, "\n").trim();
}

function normalizeUrlCandidate(value: string) {
  const firstMatch = value.match(URL_PATTERN)?.[0] ?? "";

  if (!firstMatch) {
    return null;
  }

  try {
    const url = new URL(firstMatch);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeUrlWithMeta(input: string | null | undefined): NormalizedUrlResult {
  if (typeof input !== "string") {
    return { value: null, hadInput: false, wasCleaned: false };
  }

  const trimmed = toSingleLineText(input);

  if (!trimmed) {
    return { value: null, hadInput: false, wasCleaned: false };
  }

  const markdownCandidate = trimmed.match(MARKDOWN_LINK_PATTERN)?.[1] ?? "";
  const candidates = [markdownCandidate, trimmed].filter(Boolean);

  for (const candidate of candidates) {
    const normalized = normalizeUrlCandidate(candidate);

    if (normalized) {
      return {
        value: normalized,
        hadInput: true,
        wasCleaned: normalized !== trimmed,
      };
    }
  }

  return {
    value: null,
    hadInput: true,
    wasCleaned: false,
  };
}

export function normalizeUrl(input: string | null | undefined) {
  return normalizeUrlWithMeta(input).value;
}

import { timingSafeEqual } from "node:crypto";

export function requestHasValidToken(req, expectedToken, {
  alternativeHeaders = []
} = {}) {
  const expected = String(expectedToken || "");
  if (!expected) return false;
  const candidates = [
    extractBearerToken(req?.headers?.authorization),
    ...alternativeHeaders.map((name) => req?.headers?.[String(name).toLowerCase()])
  ];
  return candidates.some((candidate) => safeTokenEqual(candidate, expected));
}

export function extractBearerToken(value) {
  const match = String(value || "").match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}

export function safeTokenEqual(value, expected) {
  const left = Buffer.from(String(value || ""));
  const right = Buffer.from(String(expected || ""));
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

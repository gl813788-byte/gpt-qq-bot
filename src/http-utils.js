export function sendJson(res, code, body, headers = {}) {
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "x-content-type-options": "nosniff",
    "cache-control": "no-store",
    ...headers
  });
  res.end(JSON.stringify(body));
}

export function corsHeaders(origin, allowedOrigins = []) {
  const normalizedOrigin = String(origin || "").trim();
  if (!normalizedOrigin || !isRequestOriginAllowed(normalizedOrigin, allowedOrigins)) return {};
  return {
    "access-control-allow-origin": normalizedOrigin,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "authorization,content-type,x-codex-api-token,x-onebot-access-token",
    "access-control-max-age": "600",
    "vary": "origin"
  };
}

export function isRequestOriginAllowed(origin, allowedOrigins = []) {
  const normalizedOrigin = String(origin || "").trim();
  if (!normalizedOrigin) return true;
  const allowed = new Set((Array.isArray(allowedOrigins) ? allowedOrigins : [])
    .map((value) => String(value || "").trim())
    .filter(Boolean));
  return allowed.has("*") || allowed.has(normalizedOrigin);
}

export function parseAllowedOrigins(value, defaults = []) {
  const configured = String(value || "")
    .split(/[,\s]+/g)
    .map((item) => item.trim().replace(/\/$/, ""))
    .filter(Boolean);
  return [...new Set(configured.length > 0 ? configured : defaults)];
}

export function isLoopbackHost(host) {
  const value = String(host || "").trim().toLowerCase().replace(/^\[|\]$/g, "");
  return value === "localhost" || value === "127.0.0.1" || value === "::1";
}

export function isLoopbackRequestHost(hostHeader) {
  const value = String(hostHeader || "").trim();
  if (!value || /[\s\\/@]/.test(value)) return false;
  try {
    return isLoopbackHost(new URL(`http://${value}`).hostname);
  } catch {
    return false;
  }
}

export class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function readBody(req, { maxBytes = 1024 * 1024, requireJson = false } = {}) {
  const contentType = String(req.headers?.["content-type"] || "").split(";", 1)[0].trim().toLowerCase();
  if (requireJson && contentType !== "application/json") {
    throw new HttpError(415, "Content-Type must be application/json");
  }
  const contentLength = Number(req.headers?.["content-length"] || 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new HttpError(413, "Request body is too large");
  }

  const chunks = [];
  let receivedBytes = 0;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    receivedBytes += buffer.length;
    if (receivedBytes > maxBytes) {
      throw new HttpError(413, "Request body is too large");
    }
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) return {};
  try {
    const body = JSON.parse(text);
    if (!body || Array.isArray(body) || typeof body !== "object") {
      throw new HttpError(400, "Request body must be a JSON object");
    }
    return body;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, "Request body must be valid JSON");
  }
}

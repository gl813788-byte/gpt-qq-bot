import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { Readable } from "node:stream";

const redirectStatuses = new Set([301, 302, 303, 307, 308]);

export async function fetchWithUrlPolicy(input, options = {}, {
  allowedPrivateOrigins = [],
  allowDataImages = false,
  maxRedirects = 4,
  resolveHostname = defaultResolveHostname,
  fetchImpl = fetch
} = {}) {
  let currentUrl = new URL(String(input || ""));
  const allowedOrigins = new Set(allowedPrivateOrigins.map(normalizeOrigin).filter(Boolean));

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const policy = await inspectSafeUrl(currentUrl, { allowedOrigins, allowDataImages, resolveHostname });
    const response = fetchImpl === fetch
      ? await pinnedFetch(currentUrl, { ...options, redirect: "manual" }, policy)
      : await fetchImpl(currentUrl, { ...options, redirect: "manual" });
    if (!redirectStatuses.has(response.status)) return response;
    if (redirectCount === maxRedirects) {
      await response.body?.cancel?.().catch?.(() => undefined);
      throw createUrlPolicyError("URL_REDIRECT_LIMIT", `Too many redirects while fetching ${currentUrl.origin}`);
    }
    const location = response.headers?.get?.("location");
    if (!location) return response;
    await response.body?.cancel?.().catch?.(() => undefined);
    currentUrl = new URL(location, currentUrl);
  }
  throw createUrlPolicyError("URL_REDIRECT_LIMIT", "Too many redirects");
}

export async function assertSafeUrl(url, {
  allowedOrigins = new Set(),
  allowDataImages = false,
  resolveHostname = defaultResolveHostname
} = {}) {
  await inspectSafeUrl(url, { allowedOrigins, allowDataImages, resolveHostname });
  return true;
}

async function inspectSafeUrl(url, {
  allowedOrigins = new Set(),
  allowDataImages = false,
  resolveHostname = defaultResolveHostname
} = {}) {
  const parsed = url instanceof URL ? url : new URL(String(url || ""));
  if (parsed.protocol === "data:") {
    if (allowDataImages && /^data:image\/[a-z0-9.+-]+;base64,/i.test(parsed.href)) return { data: true, addresses: [] };
    throw createUrlPolicyError("URL_PROTOCOL_BLOCKED", "Only base64 image data URLs are allowed");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw createUrlPolicyError("URL_PROTOCOL_BLOCKED", `Blocked URL protocol: ${parsed.protocol}`);
  }
  if (parsed.username || parsed.password) {
    throw createUrlPolicyError("URL_CREDENTIALS_BLOCKED", "URLs containing credentials are not allowed");
  }
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  const explicitlyAllowed = allowedOrigins.has(parsed.origin);
  if (!hostname || (!explicitlyAllowed && (hostname === "localhost" || hostname.endsWith(".localhost")))) {
    throw createUrlPolicyError("URL_PRIVATE_ADDRESS", `Blocked private hostname: ${hostname || "empty"}`);
  }
  const addresses = isIP(hostname) ? [hostname] : await resolveHostname(hostname);
  if (!addresses.length || (!explicitlyAllowed && addresses.some(isPrivateOrReservedAddress))) {
    throw createUrlPolicyError("URL_PRIVATE_ADDRESS", `Blocked private or unresolved address for ${hostname}`);
  }
  return { data: false, addresses: [...new Set(addresses.map(String))] };
}

async function pinnedFetch(url, options, policy) {
  if (policy.data) return fetch(url, options);
  const transport = url.protocol === "https:" ? https : http;
  const method = String(options.method || "GET").toUpperCase();
  const lookupPinnedAddress = createPinnedLookup(policy.addresses);
  return new Promise((resolve, reject) => {
    const request = transport.request(url, {
      method,
      headers: options.headers,
      signal: options.signal,
      lookup: lookupPinnedAddress
    }, (incoming) => {
      const headers = new Headers();
      for (const [name, value] of Object.entries(incoming.headers)) {
        if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
        else if (value != null) headers.set(name, String(value));
      }
      const status = Number(incoming.statusCode || 500);
      const noBody = method === "HEAD" || [204, 205, 304].includes(status);
      resolve(new Response(noBody ? null : Readable.toWeb(incoming), {
        status,
        statusText: incoming.statusMessage || "",
        headers
      }));
    });
    request.once("error", reject);
    if (options.body == null) request.end();
    else if (typeof options.body === "string" || Buffer.isBuffer(options.body) || options.body instanceof Uint8Array) request.end(options.body);
    else {
      request.destroy(createUrlPolicyError("URL_BODY_UNSUPPORTED", "Pinned fetch only supports buffered request bodies"));
    }
  });
}

export function createPinnedLookup(addresses) {
  const validated = [...new Set((Array.isArray(addresses) ? addresses : []).map(String))]
    .map((address) => ({ address, family: isIP(address) }))
    .filter((entry) => entry.family === 4 || entry.family === 6);
  if (!validated.length) throw createUrlPolicyError("URL_PRIVATE_ADDRESS", "No validated address is available");
  return (_hostname, options, callback) => {
    const requestedFamily = Number(options?.family || 0);
    const matching = requestedFamily ? validated.filter((entry) => entry.family === requestedFamily) : validated;
    const selected = matching[0] || validated[0];
    if (options?.all) callback(null, matching.length ? matching : validated);
    else callback(null, selected.address, selected.family);
  };
}

export function isPrivateOrReservedAddress(address) {
  const value = String(address || "").toLowerCase().replace(/^\[|\]$/g, "");
  if (value.includes(".")) return isPrivateOrReservedIpv4(value.split(":").at(-1));
  if (isIP(value) !== 6) return true;
  if (value === "::" || value === "::1" || value.startsWith("::")) return true;
  if (value.startsWith("::ffff:")) return isPrivateOrReservedIpv4(value.slice("::ffff:".length));
  const firstHextet = Number.parseInt(value.split(":", 1)[0], 16);
  if (!Number.isInteger(firstHextet) || firstHextet < 0x2000 || firstHextet > 0x3fff) return true;
  return /^(?:2001:(?:0{0,3}[0-2]|db8):|2002:|3fff:)/i.test(value);
}

function isPrivateOrReservedIpv4(address) {
  const parts = String(address || "").split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b, c] = parts;
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 192 && b === 0 && (c === 0 || c === 2))
    || (a === 198 && (b === 18 || b === 19 || b === 51))
    || (a === 203 && b === 0 && c === 113)
    || a >= 224;
}

async function defaultResolveHostname(hostname) {
  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
}

function normalizeOrigin(value) {
  try {
    return new URL(String(value || "")).origin;
  } catch {
    return "";
  }
}

function createUrlPolicyError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

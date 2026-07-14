import { createWriteStream } from "node:fs";
import { mkdir, open, rename, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { basename, dirname, join } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { syncDirectory } from "./file-store.js";

const defaultMaxBytes = 20 * 1024 * 1024;

export class PayloadTooLargeError extends Error {
  constructor(maxBytes) {
    super(`Response body exceeds ${maxBytes} bytes`);
    this.name = "PayloadTooLargeError";
    this.code = "PAYLOAD_TOO_LARGE";
    this.maxBytes = maxBytes;
  }
}

export async function writeResponseBodyToFile(response, filePath, {
  maxBytes = defaultMaxBytes,
  mode = 0o600
} = {}) {
  if (!response?.body) throw new Error("Response body is empty");
  const limit = normalizeMaxBytes(maxBytes);
  const declaredLength = Number(response.headers?.get?.("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > limit) {
    await cancelResponseBody(response);
    throw new PayloadTooLargeError(limit);
  }

  const directory = dirname(filePath);
  const temporaryPath = join(directory, `.${basename(filePath)}.${process.pid}.${randomUUID()}.tmp`);
  const source = toNodeReadable(response.body);
  let receivedBytes = 0;
  const limiter = new Transform({
    transform(chunk, _encoding, callback) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      receivedBytes += buffer.length;
      if (receivedBytes > limit) {
        callback(new PayloadTooLargeError(limit));
        return;
      }
      callback(null, buffer);
    }
  });

  await mkdir(directory, { recursive: true });
  try {
    await pipeline(
      source,
      limiter,
      createWriteStream(temporaryPath, { flags: "wx", mode })
    );
    const handle = await open(temporaryPath, "r");
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
    await rename(temporaryPath, filePath);
    await syncDirectory(directory);
    return { path: filePath, bytes: receivedBytes };
  } finally {
    await unlink(temporaryPath).catch(() => undefined);
  }
}

export async function readResponseJson(response, { maxBytes = 2 * 1024 * 1024 } = {}) {
  if (!response?.body) return {};
  const limit = normalizeMaxBytes(maxBytes);
  const declaredLength = Number(response.headers?.get?.("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > limit) {
    await cancelResponseBody(response);
    throw new PayloadTooLargeError(limit);
  }
  const chunks = [];
  let receivedBytes = 0;
  try {
    for await (const chunk of toNodeReadable(response.body)) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      receivedBytes += buffer.length;
      if (receivedBytes > limit) throw new PayloadTooLargeError(limit);
      chunks.push(buffer);
    }
  } catch (error) {
    await cancelResponseBody(response);
    throw error;
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks, receivedBytes).toString("utf8"));
}

export function isSupportedImageContentType(contentType) {
  const value = String(contentType || "").split(";", 1)[0].trim().toLowerCase();
  return !value || value.startsWith("image/") || value === "application/octet-stream";
}

function toNodeReadable(body) {
  if (typeof body.getReader === "function") return Readable.fromWeb(body);
  if (typeof body.pipe === "function") return body;
  throw new TypeError("Unsupported response body stream");
}

function normalizeMaxBytes(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : defaultMaxBytes;
}

async function cancelResponseBody(response) {
  try {
    await response.body?.cancel?.();
  } catch {
    // The stream may already be locked or closed.
  }
}

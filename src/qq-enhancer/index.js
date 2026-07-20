import { copyFile, mkdir, readdir, stat } from "node:fs/promises";
import { basename, extname, isAbsolute, join } from "node:path";
import crypto from "node:crypto";
import { isSupportedImageContentType, writeResponseBodyToFile } from "../bounded-stream.js";
import { fetchWithUrlPolicy } from "../safe-fetch.js";

export {
  evaluateQqProactiveInterest,
  judgeQqColdGroupTopicStart,
  judgeQqPrivateProactiveStart,
  runQqInterestModelStructuredTask,
  scoreQqTextInterest,
  shouldProactivelyReplyToQq
} from "./proactive-interest.js";
export {
  collectQqContextImages,
  getQqGroupRecentContextLimit,
  snapshotQqContextImages
} from "./context-images.js";

const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
let imageMaxBytes = 20 * 1024 * 1024;
let oneBotApiBase = "http://127.0.0.1:3000";
let safeFetchMode = "strict";

export function configureQqEnhancer(options = {}) {
  const requestedMaxBytes = Number(options.imageMaxBytes);
  imageMaxBytes = Number.isFinite(requestedMaxBytes)
    ? Math.max(256 * 1024, Math.min(100 * 1024 * 1024, Math.floor(requestedMaxBytes)))
    : imageMaxBytes;
  oneBotApiBase = String(options.oneBotApiBase || oneBotApiBase).replace(/\/$/, "");
  safeFetchMode = options.safeFetchMode === "proxy-compatible" ? "proxy-compatible" : "strict";
}

export function buildQqSendPlan(_event, reply) {
  const raw = String(reply || "").trim();
  if (!raw) return { bubbles: [], flattened: "" };
  const explicit = raw
    .split(/(?:^|\r?\n)[ \t]*\|\|\|[ \t]*(?=\r?\n|$)/g)
    .map((item) => item.trim())
    .filter(Boolean);
  const bubbles = (explicit.length > 1 ? explicit : splitLongReply(raw))
    .slice(0, 6);
  return {
    bubbles,
    flattened: bubbles.join("\n")
  };
}

export async function sendQqGroupBubbles({ event, reply, sendGroupMessage, quoteFirstBubble = true, delayMs = 650 }) {
  const plan = buildQqSendPlan(event, reply);
  const bubbles = plan.bubbles || [];
  if (bubbles.length === 0) return { ok: true, bubbles: [], results: [] };
  const results = [];
  for (const [index, bubble] of bubbles.entries()) {
    if (index > 0) await sleep(Math.max(0, Number(delayMs || 0)));
    results.push(await sendGroupMessage(bubble, {
      quoteSource: index === 0 && quoteFirstBubble && event?.type !== "private_message"
    }));
  }
  return {
    ok: results.every((result) => result?.ok !== false),
    bubbles,
    flattened: plan.flattened,
    results
  };
}

export async function buildQqStickerCatalog(stickerDir) {
  if (!stickerDir) return [];
  const entries = await readdir(stickerDir, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isFile() && imageExtensions.has(extname(entry.name).toLowerCase()))
    .map((entry) => ({
      name: basename(entry.name, extname(entry.name)),
      file: join(stickerDir, entry.name)
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
}

export function formatQqStickerCatalog(catalog = []) {
  const list = Array.isArray(catalog) ? catalog : [];
  if (!list.length) return "（本地表情包库为空）";
  return list.slice(0, 80).map((item) => `- ${item.name}`).join("\n");
}

export function buildQqImageSegment(filePath) {
  return { type: "image", data: { file: `file://${filePath}` } };
}

export function extractOneBotImageInputs(payload) {
  const segments = Array.isArray(payload?.message)
    ? payload.message
    : Array.isArray(payload)
      ? payload
      : [];
  const images = [];
  for (const segment of segments) {
    if (String(segment?.type || "").toLowerCase() !== "image") continue;
    const data = segment.data && typeof segment.data === "object" ? segment.data : {};
    const file = data.file || data.file_id || data.fileId || data.name || "";
    const url = data.url || data.src || "";
    if (!file && !url) continue;
    images.push({
      file: file ? String(file) : "",
      url: url ? String(url) : "",
      fileSize: data.file_size || data.fileSize || data.size || null,
      summary: data.summary || "",
      raw: data
    });
  }
  return dedupeImages(images);
}

export function formatQqImageSummary(images = []) {
  const list = Array.isArray(images) ? images : [];
  if (!list.length) return "";
  return list.map((image, index) => {
    const parts = [
      `图片${index + 1}`,
      image.summary ? `说明=${image.summary}` : null,
      image.file ? `file=${image.file}` : null,
      image.fileSize ? `size=${image.fileSize}` : null,
      image.url ? "有下载地址" : null
    ].filter(Boolean);
    return parts.join("，");
  }).join("；");
}

export async function prepareQqModelImages(images = [], { outputDir, fetchOneBotImage } = {}) {
  const list = Array.isArray(images) ? images : [];
  if (!list.length) return [];
  const dir = outputDir || join(process.cwd(), "runtime", "qq-images");
  await mkdir(dir, { recursive: true });
  const output = [];
  for (const image of list.slice(0, 4)) {
    const path = await prepareSingleImage(image, { outputDir: dir, fetchOneBotImage }).catch(() => "");
    if (path) output.push(path);
  }
  return [...new Set(output)];
}

export async function resolveQqReplyMedia(reply, { stickerDir } = {}) {
  const text = String(reply || "");
  const imagePaths = extractImageMarkers(text)
    .map(resolveLocalPath)
    .filter(Boolean);
  const stickerNames = [...text.matchAll(/\[\[qq_sticker:([^\]\n]+)\]\]/g)].map((match) => match[1].trim()).filter(Boolean);
  const stickerCatalog = stickerNames.length ? await buildQqStickerCatalog(stickerDir) : [];
  const stickerPaths = stickerNames.flatMap((name) => {
    const normalized = normalizeName(name);
    return stickerCatalog
      .filter((item) => normalizeName(item.name) === normalized || item.name.includes(name))
      .map((item) => item.file);
  });
  return [...new Set([...imagePaths, ...stickerPaths])].filter(Boolean);
}

export function stripQqImageAttachmentMarkers(text) {
  return String(text || "")
    .replace(/\[\[qq_image:[^\]\n]+\]\]/g, "")
    .replace(/\[\[qq_sticker:[^\]\n]+\]\]/g, "")
    .replace(/\[\[qq_file:[^\]\n]+\]\]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitLongReply(text) {
  if (text.length <= 260) return [text];
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (lines.length > 1) return lines;
  return text
    .split(/(?<=[。！？!?])\s*/g)
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((bubbles, part) => {
      const last = bubbles[bubbles.length - 1] || "";
      if (!last || `${last}${part}`.length > 220) bubbles.push(part);
      else bubbles[bubbles.length - 1] = `${last}${part}`;
      return bubbles;
    }, []);
}

async function prepareSingleImage(image, { outputDir, fetchOneBotImage } = {}) {
  if (Number(image?.fileSize || 0) > imageMaxBytes) {
    throw new Error(`QQ image exceeds ${imageMaxBytes} bytes`);
  }
  const direct = existingImagePath(image);
  if (direct) return copyImage(direct, outputDir);
  const file = image?.file ? String(image.file) : "";
  if (file && fetchOneBotImage) {
    try {
      const data = await fetchOneBotImage(file);
      const fetchedPath = existingImagePath(data);
      if (fetchedPath) return copyImage(fetchedPath, outputDir);
      if (data?.url) return downloadImage(data.url, outputDir, data.file_name || data.file || file);
    } catch {
      // Account stickers may have a display-only filename alongside a usable URL.
      // A failed OneBot get_image lookup must not prevent the direct URL fallback.
    }
  }
  if (image?.url) return downloadImage(String(image.url), outputDir, file || "qq-image");
  return "";
}

function existingImagePath(image) {
  const value = [image?.path, image?.file_path, image?.filePath, image?.file]
    .map((item) => String(item || "").replace(/^file:\/\//, "").trim())
    .find((item) => item && isAbsolute(item));
  return value || "";
}

async function copyImage(sourcePath, outputDir) {
  const sourceStats = await stat(sourcePath);
  if (!sourceStats.isFile()) throw new Error("QQ image source is not a regular file");
  if (sourceStats.size > imageMaxBytes) {
    throw new Error(`QQ image exceeds ${imageMaxBytes} bytes`);
  }
  await mkdir(outputDir, { recursive: true });
  const extension = imageExtension(sourcePath, "");
  const safeName = basename(sourcePath).replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 80) || "qq-image";
  const outputPath = join(outputDir, `${Date.now()}-${crypto.randomUUID()}-${safeName}${safeName.toLowerCase().endsWith(extension) ? "" : extension}`);
  await copyFile(sourcePath, outputPath);
  return outputPath;
}

async function downloadImage(url, outputDir, nameHint = "qq-image") {
  await mkdir(outputDir, { recursive: true });
  const response = await fetchWithUrlPolicy(url, {
    headers: { "user-agent": "codex-qq-bot/1.0" },
    signal: AbortSignal.timeout(15000)
  }, {
    allowedPrivateOrigins: [oneBotApiBase],
    allowDataImages: true,
    mode: safeFetchMode
  });
  if (!response.ok) throw new Error(`image download returned HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (!isSupportedImageContentType(contentType)) {
    throw new Error(`image download returned unsupported content type: ${contentType}`);
  }
  const extension = imageExtension(nameHint, contentType);
  const safeName = String(nameHint || "qq-image").replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 80) || "qq-image";
  const outputPath = join(outputDir, `${Date.now()}-${crypto.randomUUID()}-${safeName}${safeName.toLowerCase().endsWith(extension) ? "" : extension}`);
  await writeResponseBodyToFile(response, outputPath, { maxBytes: imageMaxBytes });
  return outputPath;
}

function imageExtension(nameHint, contentType) {
  const fromName = extname(String(nameHint || "")).toLowerCase();
  if (imageExtensions.has(fromName)) return fromName;
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("gif")) return ".gif";
  return ".jpg";
}

function extractImageMarkers(text) {
  return [...String(text || "").matchAll(/\[\[qq_image:([^\]\n]+)\]\]/g)]
    .map((match) => match[1].trim())
    .filter(Boolean);
}

function resolveLocalPath(filePath) {
  const cleaned = String(filePath || "").replace(/^file:\/\//, "").trim();
  return isAbsolute(cleaned) ? cleaned : "";
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
}

function dedupeImages(images) {
  const seen = new Set();
  const output = [];
  for (const image of images) {
    const key = `${image.file || ""}|${image.url || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(image);
  }
  return output;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

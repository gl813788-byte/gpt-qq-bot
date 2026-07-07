import { copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
import { basename, extname, isAbsolute, join } from "node:path";
import crypto from "node:crypto";

const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

export function buildQqChatStyleInstructions(event = {}) {
  return [
    "QQ 群聊风格：",
    "- 回复尽量短，像群里自然接话，不要写客服式长段落。",
    "- 不要复读群友昵称，不要解释自己是 AI，不要主动暴露后台工具。",
    "- 能一句话说清就一句话；需要解释时也先给结论。",
    "- 遇到抽象玩笑、表情包、吐槽，可以轻微接梗；不要上升到现实攻击、歧视、性骚扰或隐私威胁。",
    event?.type === "private_message" ? "- 当前是私聊，可以比群聊稍微完整一点。" : "- 当前是群聊，避免刷屏。"
  ].join("\n");
}

export function buildQqReplyWorkspaceStyleInstructions() {
  return [
    "QQ enhancer 内置规则：少用标题和列表，默认短句；群聊接梗可以轻微吐槽，但不要攻击现实身份。",
    "如果回复超过 3 句，考虑用气泡分隔符拆成多条短消息。"
  ];
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

export async function sendQqGroupBubbles({ event, reply, sendGroupMessage, quoteFirstBubble = true }) {
  const plan = buildQqSendPlan(event, reply);
  const bubbles = plan.bubbles || [];
  if (bubbles.length === 0) return { ok: true, bubbles: [], results: [] };
  const results = [];
  for (const [index, bubble] of bubbles.entries()) {
    if (index > 0) await sleep(650);
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

export function scoreQqTextInterest(text, event = {}) {
  const normalized = String(text || "").trim();
  if (!normalized) return 0;
  let score = 0;
  if (event.type === "private_message" || event.type === "group_at" || event.hasSelfAtSegment) score += 8;
  if (event.isReplyToSelf) score += 6;
  if (/(看|看看|看下|识别|评价|锐评|这图|图片|截图|表情包|什么意思|什么梗|查一下|搜一下|最新|新闻|攻略|推荐)/i.test(normalized)) score += 5;
  if (/(怎么|为什么|咋|能不能|可以吗|有没有|是不是|对不对|哪[个些]|多少)/i.test(normalized)) score += 2;
  if (/[?？]$/.test(normalized)) score += 1;
  if (normalized.length > 80) score += 1;
  if (/\[CQ:image,/i.test(normalized) || (Array.isArray(event.images) && event.images.length > 0)) score += 2;
  return score;
}

export function shouldProactivelyReplyToQq(event = {}, state = {}, helpers = {}) {
  if (!event.groupId) return { ok: false, reason: "not a group message" };
  if (!state.proactive?.enabled) return { ok: false, reason: "proactive disabled" };
  const minIntervalMs = Number(state.proactive.minIntervalMs || 180000);
  const lastAt = Number(state.proactive.lastGroupReplyAt?.[event.groupId] || 0);
  if (lastAt && Date.now() - lastAt < minIntervalMs) {
    return { ok: false, reason: "proactive cooldown" };
  }
  const text = helpers.stripMentionText ? helpers.stripMentionText(event.text || "") : String(event.text || "");
  const score = scoreQqTextInterest(text, event);
  const recent = Array.isArray(helpers.recentMessages) ? helpers.recentMessages.slice(-8) : [];
  const ownerContext = recent.some((item) => state.ownerUserIds?.includes?.(String(item.senderId || "")));
  if (ownerContext && score >= 4) {
    return { ok: true, reason: "owner context plus interesting message", proactive: true, ownerContext: true };
  }
  if (/(bot|机器人|GPT|assistant|你怎么看|来评价|锐评一下|帮忙看|查一下|搜一下)/i.test(text) && score >= 5) {
    return { ok: true, reason: "implicit bot request", proactive: true };
  }
  return { ok: false, reason: "interest score too low" };
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
  const direct = existingImagePath(image);
  if (direct) return copyImage(direct, outputDir);
  const file = image?.file ? String(image.file) : "";
  if (file && fetchOneBotImage) {
    const data = await fetchOneBotImage(file);
    const fetchedPath = existingImagePath(data);
    if (fetchedPath) return copyImage(fetchedPath, outputDir);
    if (data?.url) return downloadImage(data.url, outputDir, data.file_name || data.file || file);
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
  await mkdir(outputDir, { recursive: true });
  const extension = imageExtension(sourcePath, "");
  const safeName = basename(sourcePath).replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 80) || "qq-image";
  const outputPath = join(outputDir, `${Date.now()}-${crypto.randomUUID()}-${safeName}${safeName.toLowerCase().endsWith(extension) ? "" : extension}`);
  await copyFile(sourcePath, outputPath);
  return outputPath;
}

async function downloadImage(url, outputDir, nameHint = "qq-image") {
  await mkdir(outputDir, { recursive: true });
  const response = await fetch(url, {
    headers: { "user-agent": "codex-qq-bot/1.0" },
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`image download returned HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  const extension = imageExtension(nameHint, contentType);
  const safeName = String(nameHint || "qq-image").replace(/[^A-Za-z0-9._-]+/g, "-").slice(0, 80) || "qq-image";
  const outputPath = join(outputDir, `${Date.now()}-${crypto.randomUUID()}-${safeName}${safeName.toLowerCase().endsWith(extension) ? "" : extension}`);
  await writeFile(outputPath, Buffer.from(await response.arrayBuffer()));
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

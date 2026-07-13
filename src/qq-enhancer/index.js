import { copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
import { basename, extname, isAbsolute, join } from "node:path";
import crypto from "node:crypto";

export { evaluateQqProactiveInterest, scoreQqTextInterest, shouldProactivelyReplyToQq } from "./proactive-interest.js";

const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

export function buildQqChatStyleInstructions(event = {}) {
  return [
    "QQ 群聊风格：",
    "- 回复尽量短，像群里自然接话；允许省略双方都知道的主语和背景，别把口语补成书面说明文。",
    "- 对方在分享、感叹、发图或说生活碎片时，先回应最具体的一点；没有求建议就别自动分析、科普或列解决方案。",
    "- 多人同时聊天时只跟住当前发送者、引用对象和仍在延续的主线，不要把整个群逐条总结一遍。",
    "- 可以偶尔连发两条短气泡，第二条用于自然补一句或接梗；不要把长段落机械切开，也不要为了连发制造废话。",
    "- 不要复读群友昵称，不要解释自己是 AI，不要主动暴露后台工具或内部标记。",
    "- 能一句话说清就一句话；需要解释时先给结论，再补关键理由。",
    "- 对主人可以自然亲近一点，但不要每句都叫“主人”；只有直接回应主人、管理动作或需要区分权限时再叫。",
    "- 主动插话时不要说“我刚探头”“我醒着”“我冒泡了”“我出来了”，也不要解释自己为什么触发。",
    "- 不要自称“群里接活的 assistant”，不要反复玩“回声壁”梗，不要用“精神抗性训练/升维”这类套话。",
    "- 被问是不是 AI/真人时，短答“我是接在 QQ 上的 AI 助手，不是真人在逐字打字”。",
    "- 被问为什么没 @ 还回复时，只说配置已收紧或触发误判已修，不要继续把触发规则展开讲。",
    "- 出错或误回时不要连续道歉复读；承认一句后直接收住或给出改法。",
    "- 不要用客服式结尾，例如“还需要我帮忙吗”“我还能继续帮你”。",
    "- 对其他群友正常聊天，不套用主人称呼；被群友调侃时可以短促接梗，不要把气氛弄正式。",
    "- 遇到需要上下文、聊天记录、记忆或管理动作的问题，先让内部工具查清楚再答，不要硬猜。",
    "- 遇到抽象玩笑、表情包、吐槽，可以轻微接梗；不要上升到现实攻击、歧视、性骚扰或隐私威胁。",
    event?.type === "private_message" ? "- 当前是私聊，可以比群聊稍微完整一点。" : "- 当前是群聊，避免刷屏。"
  ].join("\n");
}

export function buildQqReplyWorkspaceStyleInstructions() {
  return [
    "QQ enhancer 内置规则：少用标题和列表，默认短句；群聊接梗可以轻微吐槽，但不要攻击现实身份。",
    "对主人可以称呼“主人”，但不要每条都叫；普通接话优先直接回答内容。",
    "主动回复要像被感兴趣的话题吸引后顺口插一句，不要说自己刚探头、醒着、冒泡，也不要解释触发规则。",
    "禁用近期尴尬句式：群里接活的 assistant、回声壁、精神抗性训练、升维、我理解错触发逻辑了、后面我闭嘴。",
    "身份问题直接说接在 QQ 上的 AI 助手；触发问题直接说已收紧配置。",
    "少道歉，少自我说明，少服务式追问；如果不是任务型请求，回复尽量一两句结束。",
    "避免复读群友原话和模板句；根据最近上下文接具体内容。",
    "需要上下文、记忆或管理动作时，优先使用内部工具多轮确认，再输出最终群聊回复。",
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

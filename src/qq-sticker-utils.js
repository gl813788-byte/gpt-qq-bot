import { createHash } from "node:crypto";
import { extname } from "node:path";

const genericStickerLabels = new Set([
  "动画表情",
  "动态表情",
  "表情",
  "表情包",
  "商城表情",
  "图片"
]);

export function normalizeQqStickerLabel(value) {
  return String(value || "")
    .replace(/&#91;|&lbrack;/gi, "[")
    .replace(/&#93;|&rbrack;/gi, "]")
    .replace(/&amp;/gi, "&")
    .trim()
    .replace(/^\[+|\]+$/g, "")
    .replace(/[\r\n|]+/g, " ")
    .trim()
    .slice(0, 48);
}

export function normalizeQqNativeStickerTags(...values) {
  const output = [];
  for (const value of values.flat(Infinity)) {
    const pieces = String(value || "").split(/[，,、|;/；\n]+/);
    for (const piece of pieces) {
      const tag = normalizeQqStickerLabel(piece);
      if (!tag || genericStickerLabels.has(tag) || output.includes(tag)) continue;
      output.push(tag.slice(0, 24));
      if (output.length >= 12) return output;
    }
  }
  return output;
}

export function isQqStickerImage(image = {}) {
  const raw = image?.raw && typeof image.raw === "object" ? image.raw : {};
  const subType = Number(raw.sub_type ?? raw.subType ?? -1);
  const summary = normalizeQqStickerLabel(image.summary || raw.summary);
  return Boolean(
    raw.emoji_id
    || raw.emojiId
    || raw.emoji_package_id
    || raw.emojiPackageId
    || (Number.isFinite(subType) && subType > 0)
    || /表情/.test(summary)
  );
}

export function isQqAnimatedStickerHint(value = {}) {
  const image = value?.image || value;
  const raw = image?.raw && typeof image.raw === "object" ? image.raw : image || {};
  const candidates = [
    image?.file,
    image?.url,
    image?.summary,
    raw.file,
    raw.url,
    raw.summary,
    raw.emoPath,
    raw.emoOriginalPath,
    raw.thumbPath
  ].map((item) => String(item || ""));
  return Boolean(
    value?.animated
    || image?.animated
    || raw.isAPNG
    || raw.isAnimated
    || raw.animated
    || candidates.some((item) => /动画表情|动态表情/i.test(item))
    || candidates.some((item) => /\.(?:gif|apng)(?:$|[?#])/i.test(item))
  );
}

export function extractQqReplyStickerCandidates(event = {}) {
  const current = Array.isArray(event.images) ? event.images : [];
  const quoted = Array.isArray(event.replyContext?.images) ? event.replyContext.images : [];
  const images = current.length ? current : quoted;
  const output = [];
  const seen = new Set();
  for (const image of images) {
    if (!isQqStickerImage(image)) continue;
    const raw = image?.raw && typeof image.raw === "object" ? image.raw : {};
    const file = String(image.file || raw.file || "").trim();
    const url = String(image.url || raw.url || "").trim();
    const emojiId = String(raw.emoji_id || raw.emojiId || "").trim();
    const packageId = String(raw.emoji_package_id || raw.emojiPackageId || "").trim();
    const identityValue = emojiId || file || url;
    if (!identityValue) continue;
    const identity = `received:${createHash("sha256").update(identityValue).digest("hex").slice(0, 24)}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    const summary = normalizeQqStickerLabel(image.summary || raw.summary);
    const tags = normalizeQqNativeStickerTags(summary, raw.desc, raw.ocrWord, raw.modifyWord);
    const animated = isQqAnimatedStickerHint(image);
    output.push({
      index: output.length + 1,
      identity,
      name: tags[0] || `${animated ? "收到的动图表情" : "收到的表情"}${output.length + 1}`,
      tags,
      animated,
      source: emojiId ? "market" : "received",
      emojiId,
      packageId,
      key: String(raw.key || "").trim(),
      file,
      url,
      image
    });
    if (output.length >= 4) break;
  }
  return output;
}

export function normalizeQqAccountStickerCatalog(data) {
  const rawList = Array.isArray(data) ? data : extractQqStickerLikeValues(data);
  const catalog = [];
  const seen = new Set();
  for (const [index, item] of rawList.entries()) {
    const url = extractQqStickerUrl(item);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const nativeTags = item && typeof item === "object"
      ? normalizeQqNativeStickerTags(item.desc, item.ocrWord, item.modifyWord, item.name, item.title)
      : [];
    const displayTag = nativeTags[0] || "";
    catalog.push({
      name: `账号表情${catalog.length + 1}${displayTag ? `-${displayTag}` : ""}`,
      id: extractQqStickerId(item) || undefined,
      md5: item && typeof item === "object" ? String(item.md5 || "").trim().toLowerCase() : "",
      resId: item && typeof item === "object" ? String(item.resId || "").trim() : "",
      emojiId: item && typeof item === "object" ? String(item.emoId ?? item.emojiId ?? "").trim() : "",
      url,
      source: "account",
      index: index + 1,
      tags: nativeTags,
      description: nativeTags.length ? `QQ 原生标签：${nativeTags.join("、")}` : "",
      animated: isQqAnimatedStickerHint(item)
    });
  }
  return catalog;
}

export function extractQqStickerLikeValues(value) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  for (const key of ["customFaceList", "faceList", "faces", "items", "list", "collectionItemList", "emojiInfoList"]) {
    if (Array.isArray(value[key])) return value[key];
  }
  for (const child of Object.values(value)) {
    const list = extractQqStickerLikeValues(child);
    if (list.length) return list;
  }
  return [];
}

export function extractQqStickerUrl(item) {
  if (typeof item === "string") return /^https?:\/\//i.test(item) ? item : "";
  if (!item || typeof item !== "object") return "";
  const direct = [
    item.url,
    item.src,
    item.uri,
    item.downloadUrl,
    item.originalUri,
    item.originalUrl,
    item.emoOriginalPath,
    item.emoPath,
    item.thumb,
    item.thumbnail,
    item.imageUrl,
    item.fileUrl
  ].find((value) => /^https?:\/\//i.test(String(value || "")));
  if (direct) return String(direct);
  const summary = item.summary && typeof item.summary === "object" ? item.summary : {};
  const rich = summary.richMediaSummary && typeof summary.richMediaSummary === "object" ? summary.richMediaSummary : {};
  const richDirect = [rich.originalUri, rich.originalUrl, ...(Array.isArray(rich.picList) ? rich.picList : [])]
    .find((value) => /^https?:\/\//i.test(String(value || "")));
  return richDirect ? String(richDirect) : "";
}

export function extractQqStickerId(item) {
  if (!item || typeof item !== "object") return "";
  const summary = item.summary && typeof item.summary === "object" ? item.summary : {};
  const rich = summary.richMediaSummary && typeof summary.richMediaSummary === "object" ? summary.richMediaSummary : {};
  return [item.md5, item.resId, item.cid, item.id, item.faceId, item.fileId, rich.id, rich.resId]
    .map((value) => String(value || "").trim())
    .find(Boolean) || "";
}

export function buildQqMarketStickerUrl(emojiId) {
  const id = String(emojiId || "").trim();
  if (!id) return "";
  return `https://gxh.vip.qq.com/club/item/parcel/item/${id.slice(0, 2)}/${id}/raw300.gif`;
}

export function inferStickerExtension(value) {
  const extension = extname(String(value || "").split(/[?#]/)[0]).toLowerCase();
  return [".png", ".jpg", ".jpeg", ".webp", ".gif", ".apng"].includes(extension) ? extension : "";
}

const defaultImageLimit = 4;
const maxFileLength = 512;
const maxUrlLength = 4096;
const maxSummaryLength = 240;

export function snapshotQqContextImages(images = [], { limit = defaultImageLimit } = {}) {
  const safeLimit = normalizeLimit(limit);
  const seen = new Set();
  const output = [];
  for (const image of Array.isArray(images) ? images : []) {
    const snapshot = snapshotQqContextImage(image);
    if (!snapshot) continue;
    const key = `${snapshot.file || ""}|${snapshot.url || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(snapshot);
    if (output.length >= safeLimit) break;
  }
  return output;
}

export function collectQqContextImages(entries = [], {
  limit = defaultImageLimit,
  excludeMessageId = ""
} = {}) {
  const safeLimit = normalizeLimit(limit);
  const excludedId = String(excludeMessageId || "");
  const selected = [];
  const seen = new Set();
  const list = Array.isArray(entries) ? entries : [];

  for (let entryIndex = list.length - 1; entryIndex >= 0 && selected.length < safeLimit; entryIndex -= 1) {
    const entry = list[entryIndex] || {};
    if (excludedId && String(entry.messageId || "") === excludedId) continue;
    const images = snapshotQqContextImages(entry.images, { limit: safeLimit });
    for (let imageIndex = images.length - 1; imageIndex >= 0 && selected.length < safeLimit; imageIndex -= 1) {
      const image = images[imageIndex];
      const key = `${image.file || ""}|${image.url || ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      selected.push({
        ...image,
        context: {
          sender: String(entry.sender || entry.senderLabel || entry.senderName || "群友").slice(0, 80),
          text: String(entry.text || "").slice(0, 220),
          at: entry.at || null,
          messageId: entry.messageId == null ? null : String(entry.messageId).slice(0, 120)
        }
      });
    }
  }

  return selected.reverse();
}

export function getQqGroupRecentContextLimit({ expandLevel = 0, explicitBotTrigger = false } = {}) {
  if (Number(expandLevel) > 0) return 28;
  return explicitBotTrigger ? 18 : 12;
}

function snapshotQqContextImage(image) {
  if (!image || typeof image !== "object") return null;
  const file = String(image.file || "").slice(0, maxFileLength);
  const url = String(image.url || "").slice(0, maxUrlLength);
  if (!file && !url) return null;
  const raw = snapshotQqImageRaw(image.raw);
  return {
    file,
    url,
    fileSize: normalizeFileSize(image.fileSize),
    summary: String(image.summary || raw.summary || "").slice(0, maxSummaryLength),
    ...(Object.keys(raw).length > 0 ? { raw } : {})
  };
}

function snapshotQqImageRaw(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const output = {};
  const stringKeys = [
    "summary",
    "desc",
    "ocrWord",
    "modifyWord",
    "emoji_id",
    "emojiId",
    "emoji_package_id",
    "emojiPackageId",
    "key",
    "emoPath",
    "emoOriginalPath",
    "thumbPath"
  ];
  for (const key of stringKeys) {
    if (value[key] == null || value[key] === "") continue;
    output[key] = String(value[key]).slice(0, key.toLowerCase().includes("path") ? maxUrlLength : maxSummaryLength);
  }
  for (const key of ["sub_type", "subType"]) {
    if (Number.isFinite(Number(value[key]))) output[key] = Number(value[key]);
  }
  for (const key of ["isAPNG", "isAnimated", "animated"]) {
    if (value[key] != null) output[key] = Boolean(value[key]);
  }
  return output;
}

function normalizeFileSize(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : null;
}

function normalizeLimit(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(1, Math.min(12, Math.floor(number))) : defaultImageLimit;
}

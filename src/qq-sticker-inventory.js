import { readFile } from "node:fs/promises";
import { serializeFileOperation, writeJsonAtomically } from "./file-store.js";
import { buildQqMarketStickerUrl, normalizeQqNativeStickerTags } from "./qq-sticker-utils.js";

export function createQqStickerInventory({ filePath, now = () => new Date(), limit = 300 } = {}) {
  if (!filePath) throw new Error("QQ sticker inventory requires filePath");
  let snapshot = null;

  async function load() {
    if (!snapshot) snapshot = await readSnapshot(filePath);
    return snapshot;
  }

  return {
    async list() {
      const state = await load();
      return Object.values(state.stickers)
        .sort((left, right) => String(right.lastSeenAt || "").localeCompare(String(left.lastSeenAt || "")))
        .map((item, index) => ({
          ...item,
          // QQ labels are often repeated across a whole sticker pack. Keep a
          // stable suffix so selecting one sticker never sends every same-tag
          // sticker at once.
          name: buildDownloadedStickerName(item),
          index: index + 1
        }));
    },

    async remember(candidates = []) {
      const market = (Array.isArray(candidates) ? candidates : [])
        .filter((item) => item?.emojiId && item?.packageId);
      if (!market.length) return [];
      return serializeFileOperation(filePath, async () => {
        const state = await readSnapshot(filePath);
        const timestamp = now().toISOString();
        for (const item of market) {
          const identity = `market:${item.emojiId}`;
          const previous = state.stickers[identity] || {};
          const tags = normalizeQqNativeStickerTags(item.tags, item.name, previous.tags);
          state.stickers[identity] = {
            ...previous,
            identity,
            name: tags[0] || item.name || `商城表情-${String(item.emojiId).slice(0, 8)}`,
            source: "downloaded",
            emojiId: String(item.emojiId),
            packageId: String(item.packageId),
            key: String(item.key || previous.key || ""),
            url: buildQqMarketStickerUrl(item.emojiId) || item.url || previous.url || "",
            tags,
            description: tags.length ? `QQ 商城标签：${tags.join("、")}` : "QQ 商城表情",
            animated: true,
            firstSeenAt: previous.firstSeenAt || timestamp,
            lastSeenAt: timestamp
          };
        }
        const kept = Object.values(state.stickers)
          .sort((left, right) => String(right.lastSeenAt || "").localeCompare(String(left.lastSeenAt || "")))
          .slice(0, Math.max(1, Number(limit) || 300));
        snapshot = {
          version: 1,
          updatedAt: timestamp,
          stickers: Object.fromEntries(kept.map((item) => [item.identity, item]))
        };
        await writeJsonAtomically(filePath, snapshot);
        return market;
      });
    }
  };
}

function buildDownloadedStickerName(item = {}) {
  const tag = normalizeQqNativeStickerTags(item.tags, item.name)[0] || "未标注";
  const suffix = String(item.emojiId || item.identity || "sticker").replace(/[^A-Za-z0-9]+/g, "").slice(-6) || "sticker";
  return `账号下载-${tag}-${suffix}`;
}

async function readSnapshot(filePath) {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("root must be an object");
    return {
      version: 1,
      updatedAt: parsed.updatedAt || null,
      stickers: parsed.stickers && typeof parsed.stickers === "object" && !Array.isArray(parsed.stickers)
        ? parsed.stickers
        : {}
    };
  } catch (error) {
    if (error.code === "ENOENT") return { version: 1, updatedAt: null, stickers: {} };
    throw new Error(`Unable to read QQ sticker inventory: ${error.message}`);
  }
}

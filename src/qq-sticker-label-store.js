import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { serializeFileOperation, writeJsonAtomically } from "./file-store.js";

export function createQqStickerLabelStore({ filePath, now = () => new Date() } = {}) {
  if (!filePath) throw new Error("QQ sticker label store requires filePath");
  let snapshot = null;

  async function load() {
    if (snapshot) return snapshot;
    snapshot = await readSnapshot(filePath);
    return snapshot;
  }

  async function mutate(operation) {
    return serializeFileOperation(filePath, async () => {
      snapshot = await readSnapshot(filePath);
      const result = operation(snapshot);
      snapshot.updatedAt = now().toISOString();
      await writeJsonAtomically(filePath, snapshot);
      return result;
    });
  }

  return {
    async enrich(catalog = []) {
      const state = await load();
      return (Array.isArray(catalog) ? catalog : []).map((item) => {
        const identity = getQqStickerIdentity(item);
        const label = state.stickers[identity] || null;
        return {
          ...item,
          identity,
          tags: label?.tags || [],
          description: label?.description || "",
          viewedAt: label?.viewedAt || null,
          viewCount: label?.viewCount || 0,
          labeledAt: label?.labeledAt || null
        };
      });
    },

    async markViewed(item) {
      const identity = getQqStickerIdentity(item);
      return mutate((state) => {
        const previous = state.stickers[identity] || {};
        const viewedAt = now().toISOString();
        const entry = {
          ...previous,
          identity,
          name: String(item?.name || previous.name || "表情"),
          source: String(item?.source || previous.source || (item?.url ? "account" : "local")),
          tags: normalizeTags(previous.tags),
          description: normalizeDescription(previous.description),
          viewedAt,
          viewCount: Math.max(0, Number(previous.viewCount || 0)) + 1,
          updatedAt: viewedAt
        };
        state.stickers[identity] = entry;
        return entry;
      });
    },

    async updateLabels(item, { tags = [], description = "" } = {}) {
      const identity = getQqStickerIdentity(item);
      return mutate((state) => {
        const previous = state.stickers[identity];
        if (!previous?.viewedAt) return { ok: false, reason: "sticker has not been viewed" };
        const updatedAt = now().toISOString();
        const entry = {
          ...previous,
          name: String(item?.name || previous.name || "表情"),
          tags: normalizeTags(tags),
          description: normalizeDescription(description),
          labeledAt: updatedAt,
          updatedAt
        };
        state.stickers[identity] = entry;
        return { ok: true, entry };
      });
    }
  };
}

export function getQqStickerIdentity(item = {}) {
  if (item.identity) return String(item.identity);
  const source = String(item.source || (item.url ? "account" : "local")).toLowerCase();
  const stableValue = item.id || item.file || item.url || item.name || "unknown";
  const digest = createHash("sha256").update(String(stableValue)).digest("hex").slice(0, 24);
  return `${source}:${digest}`;
}

export function normalizeQqStickerTags(value) {
  const list = Array.isArray(value) ? value : String(value || "").split(/[，,、|]/);
  return [...new Set(list
    .map((item) => String(item || "").replace(/[\r\n|]/g, " ").trim().slice(0, 24))
    .filter(Boolean))]
    .slice(0, 12);
}

function normalizeTags(value) {
  return normalizeQqStickerTags(value);
}

function normalizeDescription(value) {
  return String(value || "").replace(/[\r\n]+/g, " ").trim().slice(0, 180);
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
    throw new Error(`Unable to read QQ sticker labels: ${error.message}`);
  }
}

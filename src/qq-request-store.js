import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { serializeFileOperation, writeJsonAtomically } from "./file-store.js";

const requestStatuses = new Set(["pending", "approved", "rejected"]);

export function normalizeOneBotRequest(payload, { now = () => new Date() } = {}) {
  if (!payload || payload.post_type !== "request") return null;
  const requestType = payload.request_type === "friend" || payload.request_type === "group"
    ? payload.request_type
    : "";
  const flag = boundedString(payload.flag, 512);
  if (!requestType || !flag) return null;
  const subType = requestType === "group"
    ? (payload.sub_type === "invite" ? "invite" : "add")
    : "add";
  const key = `${requestType}:${subType}:${flag}`;
  const receivedAt = now().toISOString();
  return {
    id: createHash("sha256").update(key).digest("hex").slice(0, 10),
    key,
    requestType,
    subType,
    flag,
    userId: normalizeQqId(payload.user_id),
    groupId: normalizeQqId(payload.group_id),
    selfId: normalizeQqId(payload.self_id),
    comment: String(payload.comment || "").trim().slice(0, 500),
    eventTime: Number.isFinite(Number(payload.time)) ? Number(payload.time) : null,
    receivedAt,
    updatedAt: receivedAt,
    handledAt: null,
    handledBy: "",
    status: "pending",
    autoHandled: false,
    lastError: ""
  };
}

export function createQqRequestStore({ filePath, maxEntries = 200 }) {
  if (!filePath) throw new TypeError("filePath is required");
  let entries = [];

  async function load() {
    try {
      const body = JSON.parse(await readFile(filePath, "utf8"));
      entries = normalizeStoredEntries(body?.entries).slice(0, maxEntries);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      entries = [];
    }
    return list({ status: "all", limit: maxEntries });
  }

  async function save() {
    return serializeFileOperation(filePath, () => writeJsonAtomically(filePath, {
      version: 1,
      updatedAt: new Date().toISOString(),
      entries
    }));
  }

  async function record(payload) {
    const normalized = normalizeOneBotRequest(payload);
    if (!normalized) return { entry: null, isNew: false };
    const index = entries.findIndex((entry) => entry.key === normalized.key);
    if (index >= 0) {
      entries[index] = {
        ...entries[index],
        userId: normalized.userId || entries[index].userId,
        groupId: normalized.groupId || entries[index].groupId,
        comment: normalized.comment || entries[index].comment,
        updatedAt: normalized.updatedAt
      };
      entries.unshift(entries.splice(index, 1)[0]);
      await save();
      return { entry: { ...entries[0] }, isNew: false };
    }
    entries.unshift(normalized);
    entries = entries.slice(0, maxEntries);
    await save();
    return { entry: { ...normalized }, isNew: true };
  }

  function list({ status = "pending", limit = 20 } = {}) {
    const normalizedStatus = status === "all" ? "all" : status;
    const filtered = normalizedStatus === "all"
      ? entries
      : entries.filter((entry) => entry.status === normalizedStatus);
    return filtered.slice(0, Math.max(1, Math.min(maxEntries, Number(limit) || 20))).map((entry) => ({ ...entry }));
  }

  function find(selector = "latest", { pendingOnly = false } = {}) {
    const candidates = pendingOnly ? entries.filter((entry) => entry.status === "pending") : entries;
    const rawSelector = boundedString(selector || "latest", 512).trim().replace(/^#/, "");
    const value = rawSelector.toLowerCase();
    if (!value || /^(latest|newest|最新)$/.test(value)) return candidates[0] ? { ...candidates[0] } : null;
    const found = candidates.find((entry) => entry.id.toLowerCase() === value || entry.flag === rawSelector);
    return found ? { ...found } : null;
  }

  async function update(id, patch) {
    const index = entries.findIndex((entry) => entry.id === String(id));
    if (index < 0) return null;
    const nextStatus = patch?.status;
    entries[index] = normalizeStoredEntry({
      ...entries[index],
      status: requestStatuses.has(nextStatus) ? nextStatus : entries[index].status,
      handledAt: patch?.handledAt ?? entries[index].handledAt,
      handledBy: patch?.handledBy ?? entries[index].handledBy,
      autoHandled: patch?.autoHandled ?? entries[index].autoHandled,
      lastError: patch?.lastError ?? entries[index].lastError,
      updatedAt: new Date().toISOString()
    });
    entries.unshift(entries.splice(index, 1)[0]);
    await save();
    return { ...entries[0] };
  }

  return { load, record, list, find, update };
}

export function formatQqRequestEntry(entry) {
  if (!entry) return "未知申请";
  const kind = entry.requestType === "friend"
    ? "好友申请"
    : entry.subType === "invite" ? "群邀请" : "入群申请";
  const target = entry.requestType === "friend"
    ? `QQ ${entry.userId || "未知"}`
    : `${entry.userId ? `QQ ${entry.userId}` : "未知用户"}${entry.groupId ? ` / 群 ${entry.groupId}` : ""}`;
  const status = { pending: "待处理", approved: "已同意", rejected: "已拒绝" }[entry.status] || entry.status;
  return `#${entry.id} ${kind}｜${target}｜${status}${entry.comment ? `｜留言：${entry.comment}` : ""}`;
}

function normalizeStoredEntries(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((entry) => entry && typeof entry === "object" && entry.id && entry.flag)
    .map(normalizeStoredEntry)
    .filter(Boolean);
}

function normalizeStoredEntry(entry) {
  const requestType = entry?.requestType === "friend" || entry?.requestType === "group" ? entry.requestType : "";
  const subType = requestType === "group" && entry?.subType === "invite" ? "invite" : "add";
  const flag = boundedString(entry?.flag, 512);
  if (!requestType || !flag) return null;
  return {
    id: boundedString(entry.id, 64) || createHash("sha256").update(`${requestType}:${subType}:${flag}`).digest("hex").slice(0, 10),
    key: boundedString(entry.key, 560) || `${requestType}:${subType}:${flag}`,
    requestType,
    subType,
    flag,
    userId: normalizeQqId(entry.userId),
    groupId: normalizeQqId(entry.groupId),
    selfId: normalizeQqId(entry.selfId),
    comment: boundedString(entry.comment, 500).trim(),
    eventTime: Number.isFinite(Number(entry.eventTime)) ? Number(entry.eventTime) : null,
    receivedAt: boundedString(entry.receivedAt, 40) || new Date().toISOString(),
    updatedAt: boundedString(entry.updatedAt, 40) || new Date().toISOString(),
    handledAt: boundedString(entry.handledAt, 40) || null,
    handledBy: boundedString(entry.handledBy, 120),
    status: requestStatuses.has(entry.status) ? entry.status : "pending",
    autoHandled: Boolean(entry.autoHandled),
    lastError: boundedString(entry.lastError, 500)
  };
}

function normalizeQqId(value) {
  const id = String(value ?? "").trim();
  return /^\d{4,20}$/.test(id) ? id : "";
}

function boundedString(value, maxLength) {
  return String(value ?? "").slice(0, maxLength);
}

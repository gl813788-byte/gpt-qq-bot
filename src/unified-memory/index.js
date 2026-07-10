import { readFile } from "node:fs/promises";
import crypto from "node:crypto";
import { serializeFileOperation, writeJsonAtomically } from "../file-store.js";

const maxEntries = 600;

export function createUnifiedMemory({ memoryPath } = {}) {
  if (!memoryPath) throw new Error("memoryPath is required");
  return {
    async read({ query = "", limit = 20 } = {}) {
      const store = await readStore(memoryPath);
      const entries = selectEntries(store.entries, { query, limit });
      return {
        ok: true,
        enabled: true,
        updatedAt: store.updatedAt || null,
        latestHandoff: latestEntry(store.entries, "handoff"),
        currentState: buildCurrentState(store.entries),
        entries
      };
    },
    async status() {
      const store = await readStore(memoryPath);
      return {
        ok: true,
        enabled: true,
        updatedAt: store.updatedAt || null,
        count: store.entries.length,
        counts: countEntries(store.entries),
        currentState: buildCurrentState(store.entries)
      };
    },
    async write(entry = {}) {
      return serializeFileOperation(memoryPath, async () => {
        const store = await readStore(memoryPath);
        const normalized = normalizeEntry(entry);
        if (!normalized.summary) return { ok: false, skipped: true, reason: "empty summary" };
        const duplicateIndex = store.entries.findIndex((item) => memoryDedupeKey(item) === memoryDedupeKey(normalized));
        if (duplicateIndex >= 0) {
          store.entries[duplicateIndex] = {
            ...store.entries[duplicateIndex],
            ...normalized,
            id: store.entries[duplicateIndex].id,
            createdAt: store.entries[duplicateIndex].createdAt,
            updatedAt: new Date().toISOString()
          };
        } else {
          store.entries.push(normalized);
        }
        store.entries = store.entries.slice(-maxEntries);
        store.updatedAt = new Date().toISOString();
        await writeStore(memoryPath, store);
        return { ok: true, entry: normalized, count: store.entries.length };
      });
    },
    async clear() {
      return serializeFileOperation(memoryPath, async () => {
        const store = emptyStore();
        store.updatedAt = new Date().toISOString();
        await writeStore(memoryPath, store);
        return { ok: true };
      });
    },
    async formatForPrompt({ query = "", limit = 8 } = {}) {
      const snapshot = await this.read({ query, limit });
      const lines = [];
      if (snapshot.latestHandoff?.summary) lines.push(`最近交接：${snapshot.latestHandoff.summary}`);
      const stateParts = Object.values(snapshot.currentState || {}).filter(Boolean);
      if (stateParts.length) lines.push(`近期状态：${stateParts.join("；")}`);
      for (const entry of snapshot.entries || []) {
        lines.push(`${entry.topic ? `${entry.topic}：` : ""}${entry.summary}`);
      }
      if (!lines.length) return "";
      return [
        "统一记忆（默认内置模块）：",
        "以下内容是跨设备长期记忆，只在相关时参考；如果与最新上下文冲突，以最新上下文为准。",
        ...[...new Set(lines)].slice(0, Math.max(1, Number(limit) || 8))
      ].join("\n");
    }
  };
}

export function judgeUnifiedMemoryByRules({ text = "", source = "", channel = "" } = {}) {
  const raw = String(text || "").trim();
  if (!raw) return noneDecision("empty");
  const normalized = raw.replace(/\s+/g, "");
  if (/(忘掉|不要记|别记|删除记忆|清除记忆)/i.test(normalized)) return noneDecision("forget_request");
  const asksRecall = /(还记得|记不记得|之前|上次|刚才|刚刚|前两天|做到哪|进度|接着|继续|交接|电脑上|电脑这边|统一记忆)/i.test(normalized);
  const shouldWrite = /(完成|修好|实现|已经|改完|写入|部署|配置|决定|以后|记住|交接|总结|方案|结论|项目|文件|脚本|搜索|Tavily|NapCat|OneBot)/i.test(normalized)
    && normalized.length >= 12;
  if (asksRecall && shouldWrite) {
    return decision("both", raw, source, channel, 0.82, "recall_and_durable_fact");
  }
  if (asksRecall) return decision("read", raw, source, channel, 0.8, "recall_request");
  if (shouldWrite) return decision("write", raw, source, channel, 0.72, "durable_fact");
  return noneDecision("low_signal");
}

export function buildUnifiedMemoryJudgePrompt({ source = "", text = "" } = {}) {
  return [
    "你是统一记忆写入/读取判断器，只输出 JSON。",
    "action 只能是 none、read、write、both。",
    "当用户询问之前、上次、刚才、进度、电脑端上下文时，通常 read。",
    "当文本包含稳定结论、项目状态、配置、已完成动作、交接摘要时，通常 write。",
    "不要因为普通闲聊写入记忆。",
    "输出格式：",
    "{\"action\":\"write\",\"topic\":\"搜索配置\",\"query\":\"Tavily 搜索\",\"confidence\":0.8,\"reason\":\"durable_fact\"}",
    "",
    `来源：${source}`,
    "文本：",
    text
  ].join("\n");
}

export function parseUnifiedMemoryJudge(raw = "") {
  try {
    const parsed = JSON.parse(String(raw || "").match(/\{[\s\S]*\}/)?.[0] || raw);
    const action = ["none", "read", "write", "both"].includes(parsed.action) ? parsed.action : "none";
    return {
      action,
      topic: String(parsed.topic || parsed.query || "").trim().slice(0, 120),
      query: String(parsed.query || parsed.topic || "").trim().slice(0, 160),
      confidence: clampConfidence(parsed.confidence),
      reason: String(parsed.reason || "model").slice(0, 120)
    };
  } catch {
    return noneDecision("parse_failed");
  }
}

async function readStore(memoryPath) {
  try {
    const parsed = JSON.parse(await readFile(memoryPath, "utf8"));
    return {
      version: 1,
      updatedAt: parsed.updatedAt || null,
      entries: Array.isArray(parsed.entries) ? parsed.entries.map(normalizeStoredEntry).filter(Boolean) : []
    };
  } catch (error) {
    if (error?.code === "ENOENT") return emptyStore();
    throw new Error(`Unable to read unified memory: ${error.message}`);
  }
}

async function writeStore(memoryPath, store) {
  await writeJsonAtomically(memoryPath, store);
}

function emptyStore() {
  return { version: 1, updatedAt: null, entries: [] };
}

function normalizeEntry(entry) {
  const now = new Date().toISOString();
  return normalizeStoredEntry({
    id: entry.id || crypto.randomUUID(),
    type: normalizeType(entry.type),
    source: String(entry.source || "unknown").slice(0, 80),
    channel: String(entry.channel || "").slice(0, 80),
    originDevice: String(entry.originDevice || "").slice(0, 80),
    executionDevice: String(entry.executionDevice || "").slice(0, 80),
    mode: String(entry.mode || "").slice(0, 80),
    topic: String(entry.topic || inferTopic(entry.summary || entry.sourceTextHint || "")).trim().slice(0, 120),
    summary: String(entry.summary || "").trim().slice(0, 1200),
    sourceTextHint: String(entry.sourceTextHint || "").trim().slice(0, 500),
    confidence: clampConfidence(entry.confidence),
    zone: String(entry.zone || "base").slice(0, 40),
    createdAt: entry.createdAt || now,
    updatedAt: entry.updatedAt || now
  });
}

function normalizeStoredEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const summary = String(entry.summary || "").trim();
  if (!summary) return null;
  return {
    id: String(entry.id || crypto.randomUUID()),
    type: normalizeType(entry.type),
    source: String(entry.source || "unknown"),
    channel: String(entry.channel || ""),
    originDevice: String(entry.originDevice || ""),
    executionDevice: String(entry.executionDevice || ""),
    mode: String(entry.mode || ""),
    topic: String(entry.topic || inferTopic(summary)).trim(),
    summary,
    sourceTextHint: String(entry.sourceTextHint || ""),
    confidence: clampConfidence(entry.confidence),
    zone: String(entry.zone || "base"),
    createdAt: entry.createdAt || entry.updatedAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString()
  };
}

function normalizeType(type) {
  const value = String(type || "note");
  if (["handoff", "idea", "projectNote", "openLoop", "dailyState", "note"].includes(value)) return value;
  return "note";
}

function selectEntries(entries, { query = "", limit = 20 } = {}) {
  const max = Math.max(1, Math.min(100, Number(limit) || 20));
  const tokens = tokenize(query);
  return [...entries]
    .map((entry) => ({ entry, score: scoreEntry(entry, tokens) }))
    .filter((item) => tokens.length === 0 || item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return Date.parse(right.entry.updatedAt || right.entry.createdAt || "") - Date.parse(left.entry.updatedAt || left.entry.createdAt || "");
    })
    .slice(0, max)
    .map((item) => item.entry);
}

function scoreEntry(entry, tokens) {
  if (!tokens.length) return 1;
  const haystack = `${entry.topic} ${entry.summary} ${entry.sourceTextHint}`.toLowerCase();
  return tokens.reduce((sum, token) => sum + (haystack.includes(token) ? token.length : 0), 0);
}

function tokenize(text) {
  return [...new Set(String(text || "")
    .toLowerCase()
    .match(/[\u4e00-\u9fff]{2,}|[a-z0-9_.-]{2,}/g) || [])]
    .slice(0, 20);
}

function latestEntry(entries, type) {
  return [...entries]
    .filter((entry) => entry.type === type)
    .sort((left, right) => Date.parse(right.updatedAt || right.createdAt || "") - Date.parse(left.updatedAt || left.createdAt || ""))[0] || null;
}

function countEntries(entries) {
  return {
    handoffHistory: entries.filter((entry) => entry.type === "handoff").length,
    ideas: entries.filter((entry) => entry.type === "idea").length,
    projectNotes: entries.filter((entry) => entry.type === "projectNote").length,
    openLoops: entries.filter((entry) => entry.type === "openLoop").length,
    dailyTimeline: entries.filter((entry) => entry.type === "dailyState").length,
    notes: entries.filter((entry) => entry.type === "note").length
  };
}

function buildCurrentState(entries) {
  const recentDaily = [...entries].reverse().find((entry) => entry.type === "dailyState");
  return recentDaily ? { mood: recentDaily.summary } : {};
}

function memoryDedupeKey(entry) {
  return `${entry.type}:${entry.topic}:${entry.summary}`.toLowerCase().replace(/\s+/g, "");
}

function inferTopic(text) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, 40) || "未命名记忆";
}

function clampConfidence(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(1, numeric)) : 0.6;
}

function decision(action, text, source, channel, confidence, reason) {
  return {
    action,
    topic: inferTopic(text),
    query: text.slice(0, 160),
    source,
    channel,
    confidence,
    reason
  };
}

function noneDecision(reason) {
  return { action: "none", topic: "", query: "", confidence: 0.35, reason };
}

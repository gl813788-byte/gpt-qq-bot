import { appendFile, mkdir, open, readdir, rename, stat, unlink } from "node:fs/promises";
import crypto from "node:crypto";
import { basename, dirname, join } from "node:path";

const defaultLevels = new Set(["debug", "info", "success", "warn", "error"]);
const levelWeights = { debug: 10, info: 20, success: 25, warn: 30, error: 40 };
const defaultConsoleLevels = new Set(["success", "warn", "error"]);
const sensitiveKeyPattern = /(?:token|secret|password|passwd|authorization|api[_-]?key|credential)/i;

export function createLogger({
  filePath,
  maxBytes = 5 * 1024 * 1024,
  maxFiles = 5,
  maxPendingWrites = 5000,
  minLevel = "debug",
  consoleOutput = true,
  consoleLevels = defaultConsoleLevels,
  appendLine = appendLogLine
} = {}) {
  if (!filePath) throw new Error("Logger filePath is required");
  const normalizedMaxBytes = normalizePositiveInteger(maxBytes, 5 * 1024 * 1024);
  const normalizedMaxFiles = normalizePositiveInteger(maxFiles, 5);
  const normalizedMaxPendingWrites = normalizePositiveInteger(maxPendingWrites, 5000);
  const minimumLevel = normalizeLevel(minLevel, "debug");
  const enabledConsoleLevels = normalizeLevelSet(consoleLevels, defaultConsoleLevels);
  let writeChain = Promise.resolve();
  let pendingWrites = 0;
  let droppedWrites = 0;

  async function write(entry) {
    const normalized = normalizeEntry({
      ...entry,
      schemaVersion: entry?.schemaVersion || 2,
      id: entry?.id || crypto.randomUUID()
    });
    if (shouldPersist(normalized.level, minimumLevel)) {
      const line = `${JSON.stringify(normalized)}\n`;
      if (pendingWrites >= normalizedMaxPendingWrites) {
        droppedWrites += 1;
        if (consoleOutput && (droppedWrites === 1 || (droppedWrites & (droppedWrites - 1)) === 0)) {
          console.warn(`Structured log backlog full; dropped ${droppedWrites} entries`);
        }
      } else {
        pendingWrites += 1;
        const append = writeChain.then(() => appendLine(filePath, line, {
          maxBytes: normalizedMaxBytes,
          maxFiles: normalizedMaxFiles
        }));
        writeChain = append.catch((error) => {
          if (consoleOutput) console.warn(`Unable to write structured log: ${error.message}`);
        }).finally(() => {
          pendingWrites = Math.max(0, pendingWrites - 1);
        });
      }
    }
    if (consoleOutput && enabledConsoleLevels.has(normalized.level)) writeConsole(normalized);
    return normalized;
  }

  function buildLoggerApi(boundContext = {}) {
    const log = (level, message, details = {}, category = "system", context = {}) => write({
      level,
      category: context?.category || boundContext.category || category,
      message,
      details: {
        ...(boundContext.details || {}),
        ...(details || {}),
        ...(context?.details || {})
      },
      traceId: context?.traceId || boundContext.traceId || null,
      spanId: context?.spanId || boundContext.spanId || null,
      parentSpanId: context?.parentSpanId || boundContext.parentSpanId || null
    });
    return {
      filePath,
      debug: (message, details = {}, category = "system", context = {}) => log("debug", message, details, category, context),
      info: (message, details = {}, category = "system", context = {}) => log("info", message, details, category, context),
      success: (message, details = {}, category = "system", context = {}) => log("success", message, details, category, context),
      warn: (message, details = {}, category = "system", context = {}) => log("warn", message, details, category, context),
      error: (message, details = {}, category = "system", context = {}) => log("error", message, details, category, context),
      write,
      child(context = {}) {
        return buildLoggerApi({
          ...boundContext,
          ...context,
          details: { ...(boundContext.details || {}), ...(context.details || {}) }
        });
      },
      async flush() {
        await writeChain;
      },
      snapshot() {
        return {
          pendingWrites,
          maxPendingWrites: normalizedMaxPendingWrites,
          droppedWrites
        };
      }
    };
  }

  return buildLoggerApi();
}

function normalizeLevel(value, fallback) {
  const normalized = String(value || "").trim().toLowerCase();
  return defaultLevels.has(normalized) ? normalized : fallback;
}

function normalizeLevelSet(value, fallback) {
  const source = value instanceof Set || Array.isArray(value)
    ? [...value]
    : String(value || "").split(/[\s,|]+/g);
  const levels = new Set(source.map((item) => normalizeLevel(item, "")).filter(Boolean));
  return levels.size > 0 ? levels : new Set(fallback);
}

function normalizePositiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
}

function shouldPersist(level, minimumLevel) {
  return levelWeights[level] >= levelWeights[minimumLevel];
}

export async function readLogEntries(filePath, {
  limit = 100,
  level = "",
  category = "",
  traceId = "",
  query = "",
  groupId = "",
  senderId = "",
  since = "",
  until = "",
  minDurationMs = 0
} = {}) {
  const maxEntries = Math.max(1, Math.min(1000, Number(limit) || 100));
  const filters = {
    levels: normalizeFilterSet(level),
    categories: normalizeFilterSet(category),
    traceId: String(traceId || "").trim().toLowerCase(),
    query: String(query || "").trim().toLowerCase(),
    groupId: String(groupId || "").trim(),
    senderId: String(senderId || "").trim(),
    sinceMs: normalizeTimestamp(since, { relativeFromNow: true }),
    untilMs: normalizeTimestamp(until),
    minDurationMs: Math.max(0, Number(minDurationMs) || 0)
  };
  const files = await listExistingLogFiles(filePath);
  const lines = [];
  for (const file of files) {
    const handle = await open(file, "r").catch(() => null);
    if (!handle) continue;
    try {
      const { size } = await handle.stat();
      const readSize = Math.min(size, Math.max(256 * 1024, maxEntries * 8192));
      const buffer = Buffer.alloc(readSize);
      await handle.read(buffer, 0, readSize, Math.max(0, size - readSize));
      lines.push(...buffer.toString("utf8").split("\n").filter(Boolean));
    } finally {
      await handle.close().catch(() => null);
    }
  }
  const entries = [];
  for (const line of lines) {
    const parsed = parseLogLine(line);
    if (!parsed) continue;
    if (!matchesLogFilters(parsed, filters)) continue;
    entries.push(parsed);
  }
  return entries
    .sort((left, right) => String(left.ts || "").localeCompare(String(right.ts || "")))
    .slice(-maxEntries);
}

export function normalizeEntry(entry) {
  const level = defaultLevels.has(String(entry?.level || "").toLowerCase())
    ? String(entry.level).toLowerCase()
    : "info";
  return {
    schemaVersion: Number(entry?.schemaVersion || 1),
    id: entry?.id ? String(entry.id).slice(0, 120) : null,
    ts: entry?.ts || new Date().toISOString(),
    level,
    category: normalizeCategory(entry?.category),
    message: String(entry?.message || "").slice(0, 1000),
    details: sanitizeDetails(entry?.details || {}),
    traceId: entry?.traceId ? String(entry.traceId).slice(0, 120) : null,
    spanId: entry?.spanId ? String(entry.spanId).slice(0, 120) : null,
    parentSpanId: entry?.parentSpanId ? String(entry.parentSpanId).slice(0, 120) : null
  };
}

export function summarizeLogEntries(entries = []) {
  const list = Array.isArray(entries) ? entries : [];
  const byLevel = {};
  const byCategory = {};
  const durations = [];
  const traces = new Set();
  for (const entry of list) {
    const level = String(entry?.level || "info");
    const category = String(entry?.category || "system");
    byLevel[level] = Number(byLevel[level] || 0) + 1;
    byCategory[category] = Number(byCategory[category] || 0) + 1;
    if (entry?.traceId) traces.add(String(entry.traceId));
    const duration = getEntryDurationMs(entry);
    if (duration != null) durations.push(duration);
  }
  durations.sort((left, right) => left - right);
  return {
    total: list.length,
    byLevel,
    byCategory,
    traceCount: traces.size,
    firstAt: list[0]?.ts || null,
    lastAt: list.at(-1)?.ts || null,
    duration: durations.length > 0 ? {
      sampleCount: durations.length,
      p50Ms: percentile(durations, 0.5),
      p95Ms: percentile(durations, 0.95),
      maxMs: durations.at(-1)
    } : null
  };
}

function normalizeFilterSet(value) {
  return new Set(String(value || "").toLowerCase().split(/[,|\s]+/).map((item) => item.trim()).filter(Boolean));
}

function normalizeTimestamp(value, { relativeFromNow = false } = {}) {
  if (value == null || value === "") return null;
  if (Number.isFinite(Number(value))) return Number(value);
  const relative = String(value).trim().match(/^(\d+(?:\.\d+)?)(ms|s|m|h|d)$/i);
  if (relative && relativeFromNow) {
    const unitMs = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[relative[2].toLowerCase()];
    return Date.now() - Number(relative[1]) * unitMs;
  }
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function matchesLogFilters(entry, filters) {
  if (filters.levels.size > 0 && !filters.levels.has(String(entry.level || "").toLowerCase())) return false;
  if (filters.categories.size > 0 && !filters.categories.has(String(entry.category || "").toLowerCase())) return false;
  if (filters.traceId && !String(entry.traceId || "").toLowerCase().startsWith(filters.traceId)) return false;
  if (filters.groupId && String(entry.details?.groupId ?? "") !== filters.groupId) return false;
  if (filters.senderId && String(entry.details?.senderId ?? "") !== filters.senderId) return false;
  const timestamp = Date.parse(String(entry.ts || ""));
  if (filters.sinceMs != null && (!Number.isFinite(timestamp) || timestamp < filters.sinceMs)) return false;
  if (filters.untilMs != null && (!Number.isFinite(timestamp) || timestamp > filters.untilMs)) return false;
  if (filters.minDurationMs > 0 && Number(getEntryDurationMs(entry) || 0) < filters.minDurationMs) return false;
  if (filters.query) {
    const searchable = JSON.stringify({
      level: entry.level,
      category: entry.category,
      message: entry.message,
      details: entry.details,
      traceId: entry.traceId
    }).toLowerCase();
    if (!searchable.includes(filters.query)) return false;
  }
  return true;
}

function getEntryDurationMs(entry) {
  const details = entry?.details || {};
  const candidates = [
    details.totalDurationMs,
    details.durationMs,
    details.modelDurationMs,
    details.sendDurationMs,
    details.generationDurationMs
  ].map(Number).filter((value) => Number.isFinite(value) && value >= 0);
  return candidates.length > 0 ? Math.max(...candidates) : null;
}

function percentile(sortedValues, ratio) {
  if (!sortedValues.length) return null;
  return sortedValues[Math.min(sortedValues.length - 1, Math.max(0, Math.ceil(sortedValues.length * ratio) - 1))];
}

function normalizeCategory(category) {
  const value = String(category || "system").trim().toLowerCase();
  return value.replace(/[^a-z0-9_-]+/g, "-").slice(0, 40) || "system";
}

function sanitizeDetails(value, depth = 0) {
  if (depth > 4) return "[depth-limit]";
  if (value == null) return value;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(String(value.message || "")).slice(0, 4000),
      code: value.code || null
    };
  }
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeDetails(item, depth + 1));
  if (typeof value === "object") {
    const output = {};
    for (const [key, item] of Object.entries(value).slice(0, 80)) {
      const isSafeStatusFlag = typeof item === "boolean" && /(?:configured|enabled|available|present)$/i.test(key);
      output[key] = sensitiveKeyPattern.test(key) && !isSafeStatusFlag ? "[redacted]" : sanitizeDetails(item, depth + 1);
    }
    return output;
  }
  if (typeof value === "string") return redactString(value).slice(0, 4000);
  if (["number", "boolean"].includes(typeof value)) return value;
  return String(value).slice(0, 1000);
}

function redactString(value) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/\b(?:sk|gho|ghp|github_pat)_[A-Za-z0-9_]{12,}\b/g, "[redacted-token]")
    .replace(/([?&](?:access_token|api[_-]?key|auth(?:orization)?|key|rkey|sig(?:nature)?|token)=)[^&#\s]+/gi, "$1[redacted]");
}

async function appendLogLine(filePath, line, { maxBytes, maxFiles }) {
  await mkdir(dirname(filePath), { recursive: true });
  await rotateIfNeeded(filePath, Buffer.byteLength(line), { maxBytes, maxFiles });
  await appendFile(filePath, line, "utf8");
}

async function rotateIfNeeded(filePath, incomingBytes, { maxBytes, maxFiles }) {
  const current = await stat(filePath).catch(() => null);
  if (!current || current.size + incomingBytes <= maxBytes) return;
  const dir = dirname(filePath);
  const base = basename(filePath);
  await unlink(join(dir, `${base}.${maxFiles}`)).catch(() => null);
  for (let index = maxFiles - 1; index >= 1; index -= 1) {
    await rename(join(dir, `${base}.${index}`), join(dir, `${base}.${index + 1}`)).catch(() => null);
  }
  await rename(filePath, join(dir, `${base}.1`)).catch(() => null);
}

async function listExistingLogFiles(filePath) {
  const dir = dirname(filePath);
  const base = basename(filePath);
  const names = await readdir(dir).catch(() => []);
  return names
    .filter((name) => name === base || name.startsWith(`${base}.`))
    .sort((left, right) => rotationOrder(right, base) - rotationOrder(left, base))
    .map((name) => join(dir, name));
}

function rotationOrder(name, base) {
  if (name === base) return 0;
  const suffix = Number(name.slice(base.length + 1));
  return Number.isFinite(suffix) ? suffix : 999;
}

function parseLogLine(line) {
  try {
    return normalizeEntry(JSON.parse(line));
  } catch {
    return null;
  }
}

function writeConsole(entry) {
  const text = `[${entry.ts}] ${entry.level.toUpperCase()} ${entry.category}: ${entry.message}`;
  if (entry.level === "error") console.error(text);
  else if (entry.level === "warn") console.warn(text);
  else console.log(text);
}

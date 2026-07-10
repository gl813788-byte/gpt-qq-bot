import { appendFile, mkdir, open, readdir, rename, stat, unlink } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

const defaultLevels = new Set(["debug", "info", "success", "warn", "error"]);
const levelWeights = { debug: 10, info: 20, success: 25, warn: 30, error: 40 };
const defaultConsoleLevels = new Set(["success", "warn", "error"]);
const sensitiveKeyPattern = /(?:token|secret|password|passwd|authorization|api[_-]?key|credential)/i;

export function createLogger({
  filePath,
  maxBytes = 5 * 1024 * 1024,
  maxFiles = 5,
  minLevel = "info",
  consoleOutput = true,
  consoleLevels = defaultConsoleLevels
} = {}) {
  if (!filePath) throw new Error("Logger filePath is required");
  const normalizedMaxBytes = normalizePositiveInteger(maxBytes, 5 * 1024 * 1024);
  const normalizedMaxFiles = normalizePositiveInteger(maxFiles, 5);
  const minimumLevel = normalizeLevel(minLevel, "info");
  const enabledConsoleLevels = normalizeLevelSet(consoleLevels, defaultConsoleLevels);
  let writeChain = Promise.resolve();

  async function write(entry) {
    const normalized = normalizeEntry(entry);
    if (shouldPersist(normalized.level, minimumLevel)) {
      const line = `${JSON.stringify(normalized)}\n`;
      const append = writeChain.then(() => appendLogLine(filePath, line, {
        maxBytes: normalizedMaxBytes,
        maxFiles: normalizedMaxFiles
      }));
      writeChain = append.catch((error) => {
        if (consoleOutput) console.warn(`Unable to write structured log: ${error.message}`);
      });
    }
    if (consoleOutput && enabledConsoleLevels.has(normalized.level)) writeConsole(normalized);
    return normalized;
  }

  return {
    filePath,
    debug(message, details = {}, category = "system") {
      return write({ level: "debug", category, message, details });
    },
    info(message, details = {}, category = "system") {
      return write({ level: "info", category, message, details });
    },
    success(message, details = {}, category = "system") {
      return write({ level: "success", category, message, details });
    },
    warn(message, details = {}, category = "system") {
      return write({ level: "warn", category, message, details });
    },
    error(message, details = {}, category = "system") {
      return write({ level: "error", category, message, details });
    },
    write,
    async flush() {
      await writeChain;
    }
  };
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
  category = ""
} = {}) {
  const maxEntries = Math.max(1, Math.min(1000, Number(limit) || 100));
  const filters = {
    level: String(level || "").trim().toLowerCase(),
    category: String(category || "").trim().toLowerCase()
  };
  const files = await listExistingLogFiles(filePath);
  const lines = [];
  for (const file of files) {
    const handle = await open(file, "r").catch(() => null);
    if (!handle) continue;
    try {
      const { size } = await handle.stat();
      const readSize = Math.min(size, Math.max(64 * 1024, maxEntries * 2048));
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
    if (filters.level && parsed.level !== filters.level) continue;
    if (filters.category && parsed.category !== filters.category) continue;
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
    ts: entry?.ts || new Date().toISOString(),
    level,
    category: normalizeCategory(entry?.category),
    message: String(entry?.message || "").slice(0, 1000),
    details: sanitizeDetails(entry?.details || {}),
    traceId: entry?.traceId ? String(entry.traceId).slice(0, 120) : null
  };
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

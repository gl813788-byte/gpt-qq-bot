import { readLogEntries } from "./logger.js";

export async function buildLogsResponse(logFilePath, searchParams) {
  const limit = Number(searchParams.get("limit") || 100);
  const level = searchParams.get("level") || "";
  const category = searchParams.get("category") || "";
  const verbose = ["1", "true", "yes"].includes(String(searchParams.get("verbose") || "").toLowerCase());
  const normalizedLimit = Math.max(1, Math.min(1000, Number(limit) || 100));
  const entries = await readLogEntries(logFilePath, {
    limit: verbose ? normalizedLimit : 1000,
    level,
    category
  });
  const visibleEntries = entries
    .filter((entry) => isVisibleByDefault(entry, { verbose, level, category }))
    .slice(-normalizedLimit)
    .map((entry) => verbose ? entry : compactEntry(entry));
  return {
    logFile: logFilePath,
    limit: normalizedLimit,
    level: level || null,
    category: category || null,
    verbose,
    entries: visibleEntries
  };
}

function isVisibleByDefault(entry, { verbose, level, category }) {
  const entryLevel = String(entry.level || "info").toLowerCase();
  if (!verbose && entryLevel === "debug" && String(level).toLowerCase() !== "debug") return false;
  if (!verbose && !level && !category) {
    return ["success", "warn", "error"].includes(entryLevel)
      || ["Codex QQ Bot hub started", "QQ web lookup started"].includes(String(entry.message || ""));
  }
  return true;
}

function compactEntry(entry) {
  const details = {};
  const allowedKeys = new Set(["durationMs", "resultCount", "status", "code", "error", "reason", "url"]);
  for (const [key, value] of Object.entries(entry.details || {})) {
    if (!allowedKeys.has(key)) continue;
    details[key] = compactValue(value);
  }
  return {
    ts: entry.ts,
    level: entry.level,
    category: entry.category,
    message: entry.message,
    details,
    traceId: entry.traceId || null
  };
}

function compactValue(value, depth = 0) {
  if (value == null || typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "string") return value.length > 240 ? `${value.slice(0, 239)}...` : value;
  if (depth >= 1) return "[details-omitted]";
  if (Array.isArray(value)) return value.slice(0, 5).map((item) => compactValue(item, depth + 1));
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).slice(0, 8).map(([key, item]) => [key, compactValue(item, depth + 1)])
    );
  }
  return String(value).slice(0, 240);
}

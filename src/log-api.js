import { readLogEntries, summarizeLogEntries } from "./logger.js";

export async function buildLogsResponse(logFilePath, searchParams) {
  const limit = Number(searchParams.get("limit") || 100);
  const level = searchParams.get("level") || "";
  const category = searchParams.get("category") || "";
  const traceId = searchParams.get("traceId") || searchParams.get("trace") || "";
  const query = searchParams.get("q") || searchParams.get("query") || "";
  const groupId = searchParams.get("groupId") || searchParams.get("group") || "";
  const senderId = searchParams.get("senderId") || searchParams.get("sender") || "";
  const since = searchParams.get("since") || "";
  const until = searchParams.get("until") || "";
  const minDurationMs = Math.max(0, Number(searchParams.get("minDurationMs") || searchParams.get("slow") || 0) || 0);
  const verboseValue = String(searchParams.get("verbose") ?? "1").toLowerCase();
  const verbose = !["0", "false", "no", "off"].includes(verboseValue);
  const normalizedLimit = Math.max(1, Math.min(1000, Number(limit) || 100));
  const entries = await readLogEntries(logFilePath, {
    limit: 1000,
    level,
    category,
    traceId,
    query,
    groupId,
    senderId,
    since,
    until,
    minDurationMs
  });
  const hasAdvancedFilter = Boolean(traceId || query || groupId || senderId || since || until || minDurationMs);
  const visibleEntries = entries
    .filter((entry) => isVisibleByDefault(entry, { verbose, level, category, hasAdvancedFilter }))
    .slice(-normalizedLimit)
    .map((entry) => verbose ? entry : compactEntry(entry));
  return {
    limit: normalizedLimit,
    level: level || null,
    category: category || null,
    filters: {
      traceId: traceId || null,
      query: query || null,
      groupId: groupId || null,
      senderId: senderId || null,
      since: since || null,
      until: until || null,
      minDurationMs: minDurationMs || null
    },
    verbose,
    matched: entries.length,
    summary: summarizeLogEntries(entries),
    entries: visibleEntries
  };
}

function isVisibleByDefault(entry, { verbose, level, category, hasAdvancedFilter = false }) {
  const entryLevel = String(entry.level || "info").toLowerCase();
  const hasExplicitFilter = Boolean(level || category || hasAdvancedFilter);
  if (!verbose && entryLevel === "debug" && !hasExplicitFilter) return false;
  if (!verbose && !hasExplicitFilter) {
    return ["success", "warn", "error"].includes(entryLevel)
      || ["Codex QQ Bot hub started", "QQ web lookup started"].includes(String(entry.message || ""));
  }
  return true;
}

function compactEntry(entry) {
  const details = {};
  const allowedKeys = new Set([
    "durationMs", "totalDurationMs", "rememberDurationMs", "decisionDurationMs", "generationDurationMs", "sendDurationMs", "memoryDurationMs",
    "resultCount", "status", "outcome", "code", "error", "reason", "decisionReason", "url",
    "groupId", "senderId", "messageId", "messageType", "proactive", "triggerMode", "queuedCount", "bubbleCount", "replyChars", "sendStatus"
  ]);
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
    traceId: entry.traceId || null,
    spanId: entry.spanId || null
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

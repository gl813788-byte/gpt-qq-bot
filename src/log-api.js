import { readLogEntries } from "./logger.js";

export async function buildLogsResponse(logFilePath, searchParams) {
  const limit = Number(searchParams.get("limit") || 100);
  const level = searchParams.get("level") || "";
  const category = searchParams.get("category") || "";
  const entries = await readLogEntries(logFilePath, { limit, level, category });
  return {
    logFile: logFilePath,
    limit: Math.max(1, Math.min(1000, Number(limit) || 100)),
    level: level || null,
    category: category || null,
    entries
  };
}

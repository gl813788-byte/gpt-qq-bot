import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

export async function searchRecentCodexContext({
  query = "",
  mode = "topic",
  limit = 8,
  maxFiles = 20,
  sessionsDir = join(process.env.HOME || "", ".codex", "sessions"),
  archivedSessionsDir = join(process.env.HOME || "", ".codex", "archived_sessions")
} = {}) {
  const files = await listRecentJsonlFiles([sessionsDir, archivedSessionsDir], maxFiles);
  const tokens = tokenize(query);
  const snippets = [];
  for (const file of files) {
    const lines = await readFile(file, "utf8").then((body) => body.split("\n").filter(Boolean)).catch(() => []);
    for (const line of lines) {
      const snippet = parseCodexJsonlLine(line, file);
      if (!snippet?.text) continue;
      const score = mode === "latest" ? 1 : scoreSnippet(snippet, tokens);
      if (mode !== "latest" && tokens.length > 0 && score <= 0) continue;
      snippets.push({ ...snippet, score });
    }
  }
  return snippets
    .sort((left, right) => {
      if (mode !== "latest" && right.score !== left.score) return right.score - left.score;
      return Date.parse(right.timestamp || "") - Date.parse(left.timestamp || "");
    })
    .slice(0, Math.max(1, Math.min(100, Number(limit) || 8)));
}

export function formatRecentContextPrompt(snippets = []) {
  const lines = snippets
    .filter((snippet) => snippet?.text)
    .slice(0, 24)
    .map((snippet) => {
      const speaker = snippet.role === "assistant" ? "Codex" : snippet.role === "tool" ? "工具结果" : "用户";
      const done = snippet.completed ? " [完成态]" : "";
      const time = snippet.timestamp ? ` @${snippet.timestamp}` : "";
      return `${speaker}${time}${done}：${String(snippet.text || "").replace(/\s+/g, " ").slice(0, 700)}`;
    });
  if (!lines.length) return "";
  return [
    "最近 Codex 上下文（内置 recent-context 模块）：",
    ...lines
  ].join("\n");
}

async function listRecentJsonlFiles(baseDirs, maxFiles) {
  const output = [];
  for (const baseDir of baseDirs.filter(Boolean)) {
    await collectJsonlFiles(baseDir, output, Math.max(1, Number(maxFiles) || 20) * 3);
  }
  return output
    .sort((left, right) => right.mtimeMs - left.mtimeMs)
    .slice(0, Math.max(1, Number(maxFiles) || 20))
    .map((item) => item.path);
}

async function collectJsonlFiles(dir, output, cap) {
  if (output.length >= cap) return;
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await collectJsonlFiles(path, output, cap);
    } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      const info = await stat(path).catch(() => null);
      if (info) output.push({ path, mtimeMs: info.mtimeMs });
    }
    if (output.length >= cap) return;
  }
}

function parseCodexJsonlLine(line, file) {
  try {
    const record = JSON.parse(line);
    const timestamp = record.timestamp || record.ts || record.created_at || "";
    const role = inferRole(record);
    const text = extractText(record);
    if (!text) return null;
    return {
      role,
      text,
      timestamp,
      sourceFile: file,
      phase: inferPhase(record),
      completed: isCompletedRecord(record)
    };
  } catch {
    return null;
  }
}

function inferRole(record) {
  return String(record.role || record.message?.role || record.item?.role || record.type || "")
    .toLowerCase()
    .replace("assistant_message", "assistant")
    .replace("user_message", "user") || "event";
}

function inferPhase(record) {
  return String(record.phase || record.event || record.type || record.item?.type || "").slice(0, 80);
}

function isCompletedRecord(record) {
  const text = JSON.stringify(record).toLowerCase();
  return /final_answer|task_complete|turn_complete|completed/.test(text);
}

function extractText(record) {
  const candidates = [
    record.text,
    record.message?.content,
    record.item?.content,
    record.content,
    record.output,
    record.response
  ];
  for (const candidate of candidates) {
    const text = stringifyContent(candidate);
    if (text) return text.slice(0, 4000);
  }
  return "";
}

function stringifyContent(value) {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value.map((item) => stringifyContent(item?.text || item?.content || item)).filter(Boolean).join("\n").trim();
  }
  if (typeof value === "object") {
    if (typeof value.text === "string") return value.text.trim();
    if (typeof value.content === "string") return value.content.trim();
  }
  return "";
}

function tokenize(text) {
  return [...new Set(String(text || "")
    .toLowerCase()
    .match(/[\u4e00-\u9fff]{2,}|[a-z0-9_.-]{2,}/g) || [])]
    .slice(0, 20);
}

function scoreSnippet(snippet, tokens) {
  const haystack = `${snippet.role} ${snippet.phase} ${snippet.text}`.toLowerCase();
  return tokens.reduce((sum, token) => sum + (haystack.includes(token) ? token.length : 0), 0);
}

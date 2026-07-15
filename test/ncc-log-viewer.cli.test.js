import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const viewerPath = new URL("../scripts/ncc-log-viewer.mjs", import.meta.url);

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitFor(predicate, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await sleep(25);
  }
  throw new Error("Timed out while waiting for log viewer output");
}

test("ncc log viewer is detailed by default and compacts only when requested", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "codex-qq-log-viewer-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = join(directory, "hub.jsonl");
  const query = "search-query-".repeat(12);
  const entries = [
    { ts: "2026-01-01T00:00:00.000Z", level: "debug", category: "qq", message: "QQ message details received", details: { text: "private message" } },
    { ts: "2026-01-01T00:00:01.000Z", level: "info", category: "onebot", message: "OneBot message received", details: { textLength: 14 } },
    { ts: "2026-01-01T00:00:02.000Z", level: "info", category: "search", message: "QQ web lookup started", details: { query, results: [{ title: "result title", url: "https://example.test" }] } },
    { ts: "2026-01-01T00:00:03.000Z", level: "success", category: "codex", message: "Codex CLI finished", details: { durationMs: 42, stderr: "internal detail" } },
    { ts: "2026-01-01T00:00:04.000Z", level: "warn", category: "search", message: "QQ web lookup failed", details: { error: "timeout" } },
    { ts: "2026-01-01T00:00:05.000Z", level: "error", category: "codex", message: "Codex CLI exited with non-zero status", details: { stderr: "secret-prompt-body\nERROR: unexpected status 403 Forbidden" } }
  ];
  await writeFile(filePath, `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`, "utf8");

  const compact = await execFileAsync(process.execPath, [viewerPath.pathname, filePath, "--plain", "--compact", "--tail", "20"]);
  assert.match(compact.stdout, /Codex CLI 执行完成/);
  assert.match(compact.stdout, /QQ 联网搜索失败/);
  assert.match(compact.stdout, /QQ 联网搜索开始/);
  assert.doesNotMatch(compact.stdout, /收到 OneBot 消息|private message|result title|internal detail/);
  assert.match(compact.stdout, /\.\.\./);

  const all = await execFileAsync(process.execPath, [viewerPath.pathname, filePath, "--plain", "--all"]);
  assert.match(all.stdout, /收到 OneBot 消息/);
  assert.match(all.stdout, /private message/);

  const verbose = await execFileAsync(process.execPath, [viewerPath.pathname, filePath, "--plain"]);
  assert.match(verbose.stdout, /private message|result title|internal detail/);
  assert.match(verbose.stdout, /403 Forbidden/);
  assert.doesNotMatch(verbose.stdout, /secret-prompt-body/);
});

test("ncc log viewer highlights at-bot QQ entries separately", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "codex-qq-log-color-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = join(directory, "hub.jsonl");
  const entries = [
    {
      ts: "2026-01-01T00:00:00.000Z",
      level: "debug",
      category: "qq",
      message: "QQ message details received",
      details: { messageType: "group", text: "ordinary group message", isAt: false }
    },
    {
      ts: "2026-01-01T00:00:01.000Z",
      level: "debug",
      category: "qq",
      message: "QQ message details received",
      details: { messageType: "group", text: "at bot message", isAt: true, atTargets: ["12345"] }
    },
    {
      ts: "2026-01-01T00:00:02.000Z",
      level: "debug",
      category: "search",
      message: "QQ web lookup trigger matched",
      details: { messageType: "group_at", query: "at bot search", isAt: true }
    },
    {
      ts: "2026-01-01T00:00:03.000Z",
      level: "success",
      category: "lifecycle",
      message: "QQ reply lifecycle completed",
      traceId: "trace-colored-success",
      details: { outcome: "sent", totalDurationMs: 2300 }
    },
    {
      ts: "2026-01-01T00:00:04.000Z",
      level: "warn",
      category: "search",
      message: "QQ web lookup failed",
      details: { error: "search timeout" }
    }
  ];
  await writeFile(filePath, `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`, "utf8");

  const result = await execFileAsync(process.execPath, [viewerPath.pathname, filePath, "--color", "--tail", "20", "--summary"]);

  assert.match(result.stdout, /\x1b\[94mQQ\s+\x1b\[0m \x1b\[94m收到 QQ 消息详情\x1b\[0m/);
  assert.match(result.stdout, /\x1b\[93mQQ\s+\x1b\[0m \x1b\[93m收到 QQ 消息详情\x1b\[0m/);
  assert.match(result.stdout, /\x1b\[93m搜索\s+\x1b\[0m \x1b\[93mQQ 消息触发联网搜索\x1b\[0m/);
  assert.match(result.stdout, /\x1b\[92m成功\x1b\[0m \x1b\[97m流程\s+\x1b\[0m/);
  assert.match(result.stdout, /\x1b\[92mQQ 回复流程完成\x1b\[0m \x1b\[2m结果:\x1b\[0m \x1b\[92m已发送\x1b\[0m/);
  assert.match(result.stdout, /\x1b\[2m总用时:\x1b\[0m \x1b\[93m2\.30s\x1b\[0m/);
  assert.match(result.stdout, /\x1b\[93m警告\x1b\[0m \x1b\[96m搜索\s+\x1b\[0m \x1b\[93mQQ 联网搜索失败\x1b\[0m/);
  assert.match(result.stdout, /\x1b\[2m错误:\x1b\[0m \x1b\[91msearch timeout\x1b\[0m/);
  assert.match(result.stdout, /\x1b\[97m日志摘要\x1b\[0m/);
});

test("ncc log follower resets its offset after rotation", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "codex-qq-log-follow-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = join(directory, "hub.jsonl");
  await writeFile(filePath, `${JSON.stringify({
    ts: "2026-01-01T00:00:00.000Z",
    level: "success",
    category: "system",
    message: "before rotation",
    details: {}
  })}\n`, "utf8");

  const child = spawn(process.execPath, [viewerPath.pathname, filePath, "--plain", "--follow"], {
    stdio: ["ignore", "pipe", "pipe"]
  });
  let output = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    output += chunk;
  });
  t.after(() => {
    child.kill("SIGTERM");
  });

  await waitFor(() => output.includes("正在跟随日志"));
  await rename(filePath, `${filePath}.1`);
  await writeFile(filePath, `${JSON.stringify({
    ts: "2026-01-01T00:00:01.000Z",
    level: "warn",
    category: "system",
    message: "after rotation",
    details: { payload: "x".repeat(1024) }
  })}\n`, "utf8");

  await waitFor(() => output.includes("after rotation"));
  assert.match(output, /after rotation/);
});

test("ncc log viewer follows a trace, finds slow operations, and prints a summary", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "codex-qq-log-trace-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = join(directory, "hub.jsonl");
  const entries = [
    {
      ts: "2026-07-13T10:00:00.000Z",
      level: "debug",
      category: "lifecycle",
      message: "QQ reply lifecycle started",
      traceId: "trace-main-abcdef",
      details: { groupId: "123", senderId: "456", messageType: "group_at" }
    },
    {
      ts: "2026-07-13T10:00:02.000Z",
      level: "success",
      category: "lifecycle",
      message: "QQ reply lifecycle completed",
      traceId: "trace-main-abcdef",
      details: { groupId: "123", senderId: "456", outcome: "sent", totalDurationMs: 2200, generationDurationMs: 1800, bubbleCount: 2 }
    },
    {
      ts: "2026-07-13T10:00:03.000Z",
      level: "error",
      category: "system",
      message: "unrelated failure",
      traceId: "trace-other",
      details: { groupId: "999", durationMs: 9000 }
    }
  ];
  await writeFile(`${filePath}.1`, `${JSON.stringify({
    ts: "2026-07-13T09:59:59.000Z",
    level: "info",
    category: "search",
    message: "QQ web lookup started",
    traceId: "trace-main-abcdef",
    details: { groupId: "123", senderId: "456", durationMs: 30 }
  })}\n`, "utf8");
  await writeFile(filePath, `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`, "utf8");

  const trace = await execFileAsync(process.execPath, [
    viewerPath.pathname,
    filePath,
    "--plain",
    "--compact",
    "--trace",
    "trace-main",
    "--summary"
  ]);
  assert.match(trace.stdout, /\[trace-ma\]/);
  assert.match(trace.stdout, /QQ 回复流程开始/);
  assert.match(trace.stdout, /QQ 回复流程完成/);
  assert.match(trace.stdout, /QQ 联网搜索开始/);
  assert.match(trace.stdout, /日志摘要：3 条，1 条链路/);
  assert.doesNotMatch(trace.stdout, /unrelated failure/);

  const slow = await execFileAsync(process.execPath, [
    viewerPath.pathname,
    filePath,
    "--plain",
    "--slow",
    "2000",
    "--group",
    "123",
    "--search",
    "sent"
  ]);
  assert.match(slow.stdout, /QQ 回复流程完成/);
  assert.doesNotMatch(slow.stdout, /QQ 回复流程开始|unrelated failure/);
});

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
    { ts: "2026-01-01T00:00:04.000Z", level: "warn", category: "search", message: "QQ web lookup failed", details: { error: "timeout" } }
  ];
  await writeFile(filePath, `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`, "utf8");

  const compact = await execFileAsync(process.execPath, [viewerPath.pathname, filePath, "--plain", "--compact", "--tail", "20"]);
  assert.match(compact.stdout, /Codex CLI finished/);
  assert.match(compact.stdout, /QQ 联网搜索失败/);
  assert.match(compact.stdout, /QQ 联网搜索开始/);
  assert.doesNotMatch(compact.stdout, /收到 OneBot 消息|private message|result title|internal detail/);
  assert.match(compact.stdout, /\.\.\./);

  const all = await execFileAsync(process.execPath, [viewerPath.pathname, filePath, "--plain", "--all"]);
  assert.match(all.stdout, /收到 OneBot 消息/);
  assert.match(all.stdout, /private message/);

  const verbose = await execFileAsync(process.execPath, [viewerPath.pathname, filePath, "--plain"]);
  assert.match(verbose.stdout, /private message|result title|internal detail/);
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
    }
  ];
  await writeFile(filePath, `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`, "utf8");

  const result = await execFileAsync(process.execPath, [viewerPath.pathname, filePath, "--color", "--tail", "20"]);

  assert.match(result.stdout, /\x1b\[94mQQ\s+\x1b\[0m \x1b\[94m收到 QQ 消息详情\x1b\[0m/);
  assert.match(result.stdout, /\x1b\[93mQQ\s+\x1b\[0m \x1b\[93m收到 QQ 消息详情\x1b\[0m/);
  assert.match(result.stdout, /\x1b\[93m搜索\s+\x1b\[0m \x1b\[93mQQ 消息触发联网搜索\x1b\[0m/);
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

import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildLogsResponse } from "../src/log-api.js";
import { createLogger } from "../src/logger.js";

test("log API exposes full diagnostics by default and supports compact mode explicitly", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "codex-qq-log-api-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = join(directory, "hub.jsonl");
  const logger = createLogger({ filePath, minLevel: "debug", consoleOutput: false });
  logger.debug("QQ message details received", { text: "private message" }, "qq");
  logger.info("OneBot message received", { textLength: 14 }, "onebot");
  logger.success("Codex CLI finished", { durationMs: 42, stderr: "internal detail" }, "codex");
  logger.warn("QQ web lookup failed", { error: "timeout", query: "private query" }, "search");
  await logger.flush();

  const compact = await buildLogsResponse(filePath, new URLSearchParams("verbose=0"));
  assert.deepEqual(compact.entries.map((entry) => entry.message), ["Codex CLI finished", "QQ web lookup failed"]);
  assert.deepEqual(compact.entries.map((entry) => entry.messageZh), ["Codex CLI 执行完成", "QQ 联网搜索失败"]);
  assert.equal(compact.entries[1].errorZh, "timeout");
  assert.deepEqual(compact.entries[0].details, { durationMs: 42 });

  const verbose = await buildLogsResponse(filePath, new URLSearchParams());
  assert.equal(verbose.entries.length, 4);
  assert.equal(verbose.entries[0].details.text, "private message");
  assert.equal(verbose.entries[0].messageZh, "收到 QQ 消息详情");

  const info = await buildLogsResponse(filePath, new URLSearchParams("level=info"));
  assert.deepEqual(info.entries.map((entry) => entry.message), ["OneBot message received"]);
});

test("log API filters complete traces and returns aggregate diagnostics", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "codex-qq-log-api-trace-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = join(directory, "hub.jsonl");
  const logger = createLogger({ filePath, consoleOutput: false });
  logger.debug("QQ reply lifecycle started", { groupId: "123", senderId: "456" }, "lifecycle", { traceId: "trace-main-123" });
  logger.success("Codex CLI finished", { groupId: "123", senderId: "456", durationMs: 1800 }, "codex", { traceId: "trace-main-123" });
  logger.success("QQ reply lifecycle completed", {
    groupId: "123",
    senderId: "456",
    outcome: "sent",
    totalDurationMs: 2200,
    generationDurationMs: 1800
  }, "lifecycle", { traceId: "trace-main-123" });
  logger.error("other failure", { groupId: "999", durationMs: 5000 }, "system", { traceId: "trace-other" });
  await logger.flush();

  const trace = await buildLogsResponse(filePath, new URLSearchParams("trace=trace-main&verbose=0"));
  assert.equal(trace.matched, 3);
  assert.equal(trace.entries.length, 3);
  assert.equal(trace.entries[0].level, "debug");
  assert.equal(trace.summary.traceCount, 1);
  assert.deepEqual(trace.summary.byCategory, { lifecycle: 2, codex: 1 });
  assert.deepEqual(trace.summary.duration, { sampleCount: 2, p50Ms: 1800, p95Ms: 2200, maxMs: 2200 });

  const slow = await buildLogsResponse(filePath, new URLSearchParams("group=123&slow=2000&q=sent"));
  assert.deepEqual(slow.entries.map((entry) => entry.message), ["QQ reply lifecycle completed"]);
  assert.equal(slow.filters.groupId, "123");
  assert.equal(slow.filters.minDurationMs, 2000);
});

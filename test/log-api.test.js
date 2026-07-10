import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { buildLogsResponse } from "../src/log-api.js";
import { createLogger } from "../src/logger.js";

test("log API defaults to compact high-signal entries and exposes full diagnostics explicitly", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "codex-qq-log-api-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = join(directory, "hub.jsonl");
  const logger = createLogger({ filePath, minLevel: "debug", consoleOutput: false });
  logger.debug("QQ message details received", { text: "private message" }, "qq");
  logger.info("OneBot message received", { textLength: 14 }, "onebot");
  logger.success("Codex CLI finished", { durationMs: 42, stderr: "internal detail" }, "codex");
  logger.warn("QQ web lookup failed", { error: "timeout", query: "private query" }, "search");
  await logger.flush();

  const compact = await buildLogsResponse(filePath, new URLSearchParams());
  assert.deepEqual(compact.entries.map((entry) => entry.message), ["Codex CLI finished", "QQ web lookup failed"]);
  assert.deepEqual(compact.entries[0].details, { durationMs: 42 });

  const verbose = await buildLogsResponse(filePath, new URLSearchParams("verbose=1"));
  assert.equal(verbose.entries.length, 4);
  assert.equal(verbose.entries[0].details.text, "private message");

  const info = await buildLogsResponse(filePath, new URLSearchParams("level=info"));
  assert.deepEqual(info.entries.map((entry) => entry.message), ["OneBot message received"]);
});

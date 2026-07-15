import assert from "node:assert/strict";
import test from "node:test";
import { summarizeProcessDiagnostics } from "../src/process-diagnostics.js";

test("process diagnostics retain failure evidence without copying prompts", () => {
  const diagnostics = summarizeProcessDiagnostics({
    stderr: [
      "收到的群消息：这是一段不应进入日志的长提示词",
      "ERROR: Reconnecting... 1/5",
      "ERROR: unexpected status 403 Forbidden: subscription unavailable",
      "ERROR: unexpected status 403 Forbidden: subscription unavailable"
    ].join("\n")
  });
  assert.equal(diagnostics.summary, "ERROR: unexpected status 403 Forbidden: subscription unavailable");
  assert.deepEqual(diagnostics.lines, [
    "ERROR: Reconnecting... 1/5",
    "ERROR: unexpected status 403 Forbidden: subscription unavailable"
  ]);
  assert.equal(diagnostics.omittedLineCount, 2);
  assert.doesNotMatch(JSON.stringify(diagnostics), /收到的群消息/);
});

test("process diagnostics do not fall back to arbitrary output", () => {
  const diagnostics = summarizeProcessDiagnostics({ stdout: "private assistant reply" });
  assert.equal(diagnostics.summary, "");
  assert.deepEqual(diagnostics.lines, []);
  assert.equal(diagnostics.omittedLineCount, 1);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  CODEX_TASK_TIMEOUT_DEFAULTS,
  CODEX_TASK_TYPES,
  getCodexTaskTimeoutMs
} from "../src/codex-task-timeout.js";

test("selects a configured timeout for each Codex task type", () => {
  const timeouts = {
    [CODEX_TASK_TYPES.QQ_REPLY]: 30_000,
    [CODEX_TASK_TYPES.QQ_IMAGE_GENERATION]: 900_000
  };

  assert.equal(getCodexTaskTimeoutMs(timeouts, CODEX_TASK_TYPES.QQ_REPLY), 30_000);
  assert.equal(getCodexTaskTimeoutMs(timeouts, CODEX_TASK_TYPES.QQ_IMAGE_GENERATION), 900_000);
});

test("falls back to the task default for missing or invalid values", () => {
  assert.equal(
    getCodexTaskTimeoutMs({}, CODEX_TASK_TYPES.QQ_VISION_REPLY),
    CODEX_TASK_TIMEOUT_DEFAULTS[CODEX_TASK_TYPES.QQ_VISION_REPLY]
  );
  assert.equal(
    getCodexTaskTimeoutMs({ [CODEX_TASK_TYPES.QQ_FILE_TASK]: 0 }, CODEX_TASK_TYPES.QQ_FILE_TASK),
    CODEX_TASK_TIMEOUT_DEFAULTS[CODEX_TASK_TYPES.QQ_FILE_TASK]
  );
  assert.equal(
    getCodexTaskTimeoutMs({}, "unknown"),
    CODEX_TASK_TIMEOUT_DEFAULTS[CODEX_TASK_TYPES.QQ_REPLY]
  );
});

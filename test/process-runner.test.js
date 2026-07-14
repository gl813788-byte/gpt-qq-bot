import assert from "node:assert/strict";
import test from "node:test";
import { runJsonProcess, runProcess } from "../src/process-runner.js";

test("runs a process and parses bounded JSON output", async () => {
  const result = await runJsonProcess(process.execPath, ["-e", "process.stdout.write(JSON.stringify([{ok:true}]))"]);
  assert.deepEqual(result, [{ ok: true }]);
});

test("terminates a process that exceeds its output budget", async () => {
  await assert.rejects(
    runProcess(process.execPath, ["-e", "process.stdout.write('x'.repeat(10000)); setInterval(() => {}, 1000)"], {
      maxOutputBytes: 1024,
      timeoutMs: 5_000,
      killGraceMs: 100
    }),
    (error) => error.code === "PROCESS_OUTPUT_LIMIT"
  );
});

test("terminates a process after its deadline", async () => {
  const startedAt = Date.now();
  await assert.rejects(
    runProcess(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
      timeoutMs: 100,
      killGraceMs: 100
    }),
    (error) => error.code === "PROCESS_TIMEOUT"
  );
  assert.ok(Date.now() - startedAt < 2_000);
});

test("aborts an active process through its signal", async () => {
  const controller = new AbortController();
  const processPromise = runProcess(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
    signal: controller.signal,
    timeoutMs: 5_000,
    killGraceMs: 100
  });
  controller.abort();
  await assert.rejects(
    processPromise,
    (error) => error.name === "AbortError" || error.code === "ABORT_ERR"
  );
});

test("reports non-zero exits and invalid JSON", async () => {
  await assert.rejects(
    runProcess(process.execPath, ["-e", "process.stderr.write('bad'); process.exit(3)"]),
    (error) => error.code === "PROCESS_EXIT_ERROR" && error.exitCode === 3 && /bad/.test(error.message)
  );
  await assert.rejects(
    runJsonProcess(process.execPath, ["-e", "process.stdout.write('not-json')"]),
    (error) => error.code === "PROCESS_JSON_INVALID"
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import { createCoalescingWriter } from "../src/coalescing-writer.js";

test("coalesces a burst into one latest-state write", async () => {
  let writes = 0;
  let state = 0;
  let persisted = 0;
  const writer = createCoalescingWriter(async () => {
    writes += 1;
    persisted = state;
  }, { delayMs: 10 });

  const scheduled = Array.from({ length: 100 }, (_, index) => {
    state = index + 1;
    return writer.schedule();
  });
  await Promise.all(scheduled);

  assert.equal(writes, 1);
  assert.equal(persisted, 100);
  assert.equal(writer.snapshot().pending, 0);
});

test("performs one follow-up write when state changes during an active write", async () => {
  let releaseFirst;
  let writes = 0;
  let state = 1;
  const persisted = [];
  const writer = createCoalescingWriter(async () => {
    writes += 1;
    persisted.push(state);
    if (writes === 1) await new Promise((resolve) => { releaseFirst = resolve; });
  }, { delayMs: 0 });

  const first = writer.schedule();
  while (!releaseFirst) await new Promise((resolve) => setTimeout(resolve, 1));
  state = 2;
  const second = writer.schedule();
  releaseFirst();
  await Promise.all([first, second]);

  assert.equal(writes, 2);
  assert.deepEqual(persisted, [1, 2]);
});

test("recovers after a failed write and flushes before close", async () => {
  let attempt = 0;
  const writer = createCoalescingWriter(async () => {
    attempt += 1;
    if (attempt === 1) throw new Error("disk unavailable");
  }, { delayMs: 1 });

  await assert.rejects(writer.schedule(), /disk unavailable/);
  await writer.schedule();
  await writer.close();
  assert.equal(attempt, 2);
  await assert.rejects(writer.schedule(), (error) => error.code === "WRITER_CLOSED");
});

test("close rejects new schedules immediately while flushing an active write", async () => {
  let release;
  let started = false;
  const writer = createCoalescingWriter(async () => {
    started = true;
    await new Promise((resolve) => { release = resolve; });
  }, { delayMs: 0 });

  const scheduled = writer.schedule();
  while (!started) await new Promise((resolve) => setTimeout(resolve, 1));
  const closing = writer.close();
  await assert.rejects(writer.schedule(), (error) => error.code === "WRITER_CLOSED");
  release();
  await Promise.all([scheduled, closing]);
});

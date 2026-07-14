import assert from "node:assert/strict";
import test from "node:test";
import { createConcurrencyLimiter } from "../src/concurrency-limiter.js";

test("enforces the configured concurrency limit", async () => {
  const limiter = createConcurrencyLimiter(2);
  let active = 0;
  let maxActive = 0;
  const jobs = Array.from({ length: 6 }, (_, index) => limiter.run(async () => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    await new Promise((resolve) => setTimeout(resolve, 15));
    active -= 1;
    return index;
  }));

  assert.deepEqual(await Promise.all(jobs), [0, 1, 2, 3, 4, 5]);
  assert.equal(maxActive, 2);
  assert.deepEqual(limiter.snapshot(), {
    active: 0,
    pending: 0,
    buffered: 0,
    maxConcurrent: 2,
    maxPending: Number.POSITIVE_INFINITY,
    closed: false
  });
});

test("bounds the pending queue", async () => {
  const limiter = createConcurrencyLimiter(1, { maxPending: 1 });
  let release;
  const active = limiter.run(() => new Promise((resolve) => { release = resolve; }));
  const queued = limiter.run(() => "queued");
  await assert.rejects(
    limiter.run(() => "overflow"),
    (error) => error.code === "LIMITER_QUEUE_FULL"
  );
  assert.equal(limiter.snapshot().pending, 1);
  release("active");
  assert.deepEqual(await Promise.all([active, queued]), ["active", "queued"]);
});

test("removes aborted queued work without running it", async () => {
  const limiter = createConcurrencyLimiter(1, { maxPending: 2 });
  let release;
  let queuedRan = false;
  const active = limiter.run(() => new Promise((resolve) => { release = resolve; }));
  const controller = new AbortController();
  const queued = limiter.run(() => { queuedRan = true; }, { signal: controller.signal });
  controller.abort();
  await assert.rejects(queued, (error) => error.name === "AbortError");
  assert.equal(limiter.snapshot().pending, 0);
  release();
  await active;
  assert.equal(queuedRan, false);
});

test("compacts cancelled queue entries so abort churn stays memory-bounded", async () => {
  const limiter = createConcurrencyLimiter(1, { maxPending: 2 });
  let release;
  const active = limiter.run(() => new Promise((resolve) => { release = resolve; }));

  for (let index = 0; index < 2_000; index += 1) {
    const controller = new AbortController();
    const queued = limiter.run(() => undefined, { signal: controller.signal });
    controller.abort();
    await assert.rejects(queued, (error) => error.name === "AbortError");
  }

  const snapshot = limiter.snapshot();
  assert.equal(snapshot.pending, 0);
  assert.ok(snapshot.buffered < 64, `expected a compact queue, got ${snapshot.buffered} buffered entries`);
  release();
  await active;
});

test("close rejects queued and future work while active work can finish", async () => {
  const limiter = createConcurrencyLimiter(1, { maxPending: 2 });
  let release;
  const active = limiter.run(() => new Promise((resolve) => { release = resolve; }));
  const queued = limiter.run(() => "queued");
  assert.equal(limiter.close(), true);
  assert.equal(limiter.close(), false);
  await assert.rejects(queued, (error) => error.code === "LIMITER_CLOSED");
  await assert.rejects(limiter.run(() => "future"), (error) => error.code === "LIMITER_CLOSED");
  release("done");
  assert.equal(await active, "done");
  assert.equal(limiter.snapshot().closed, true);
});

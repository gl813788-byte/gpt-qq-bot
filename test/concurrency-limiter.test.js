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
  assert.deepEqual(limiter.snapshot(), { active: 0, pending: 0, maxConcurrent: 2 });
});

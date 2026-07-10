import assert from "node:assert/strict";
import test from "node:test";
import { createScopedReplyScheduler } from "../src/scoped-reply-scheduler.js";

test("keeps one active reply per scope and supports cancellation", () => {
  const scheduler = createScopedReplyScheduler();
  const first = scheduler.start("group:100", { groupId: "100" });

  assert.ok(first);
  assert.equal(scheduler.start("group:100"), null);
  assert.equal(scheduler.get("group:100"), first);
  assert.equal(first.signal.aborted, false);
  assert.equal(scheduler.cancel("group:100"), first);
  assert.equal(first.cancelled, true);
  assert.equal(first.signal.aborted, true);
  assert.equal(scheduler.finish(first), true);
  assert.equal(scheduler.get("group:100"), null);
  assert.ok(scheduler.start("group:100"));
});

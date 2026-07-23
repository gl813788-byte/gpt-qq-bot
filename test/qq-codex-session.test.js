import assert from "node:assert/strict";
import test from "node:test";
import {
  createEmptyQqCodexSessionStore,
  normalizeQqCodexSessionMode,
  normalizeQqCodexSessionSettings,
  removeQqCodexSessionThread,
  resolveQqCodexSessionPlan,
  upsertQqCodexSessionThread
} from "../src/qq-codex-session.js";

test("normalizes temporary, persistent, and auto session settings", () => {
  assert.equal(normalizeQqCodexSessionMode("一次性"), "temporary");
  assert.equal(normalizeQqCodexSessionMode("长期"), "persistent");
  assert.equal(normalizeQqCodexSessionMode("自动"), "auto");
  const settings = normalizeQqCodexSessionSettings({
    defaultMode: "auto",
    scopes: { "100": "长期", "private:200": "temporary", bad: "unknown" }
  });
  assert.equal(settings.defaultMode, "auto");
  assert.deepEqual({ ...settings.scopes }, { "100": "persistent", "private:200": "temporary" });
});

test("auto mode promotes frequent scopes and keeps a fresh long thread sticky", () => {
  const now = Date.parse("2026-07-24T00:00:00.000Z");
  const entries = [1, 2, 3].map((hours) => ({ at: new Date(now - hours * 60 * 60 * 1000).toISOString() }));
  const promoted = resolveQqCodexSessionPlan({
    settings: { defaultMode: "auto" },
    store: createEmptyQqCodexSessionStore(),
    scopeId: "100",
    recentReplyEntries: entries,
    now
  });
  assert.equal(promoted.effectiveMode, "persistent");
  assert.equal(promoted.reason, "auto_recent_6h");

  const store = upsertQqCodexSessionThread(createEmptyQqCodexSessionStore(), {
    scopeId: "100",
    threadId: "thread-1",
    now: new Date(now - 48 * 60 * 60 * 1000).toISOString()
  });
  const sticky = resolveQqCodexSessionPlan({
    settings: { defaultMode: "auto" },
    store,
    scopeId: "100",
    recentReplyEntries: [],
    now
  });
  assert.equal(sticky.persistent, true);
  assert.equal(sticky.reason, "auto_existing_thread");
});

test("explicit temporary mode wins and new-dialog removal cuts the thread mapping", () => {
  let store = upsertQqCodexSessionThread(createEmptyQqCodexSessionStore(), {
    scopeId: "100",
    threadId: "thread-1",
    lastContextAt: "2026-07-23T00:00:00.000Z"
  });
  const plan = resolveQqCodexSessionPlan({
    settings: { defaultMode: "persistent", scopes: { "100": "temporary" } },
    store,
    scopeId: "100",
    recentReplyEntries: [{ at: new Date().toISOString() }]
  });
  assert.equal(plan.persistent, false);
  store = removeQqCodexSessionThread(store, "100");
  assert.equal(store.threads["100"], undefined);
});

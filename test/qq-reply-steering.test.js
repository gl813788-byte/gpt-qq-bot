import assert from "node:assert/strict";
import test from "node:test";
import { createQqReplySteeringCoordinator } from "../src/qq-reply-steering.js";

test("coalesces pending entries into one steer and consumes only the accepted snapshot", async () => {
  const pending = {
    group: [
      { id: "one", text: "first" },
      { id: "two", text: "second" }
    ]
  };
  const steered = [];
  const generation = {
    id: "generation-1",
    steer: async (input) => {
      steered.push(input);
      pending.group.push({ id: "three", text: "arrived during steer" });
      return { threadId: "thread-1", turnId: "turn-1" };
    }
  };
  const coordinator = createQqReplySteeringCoordinator({
    delayMs: 0,
    getActiveGeneration: () => generation,
    getPendingEntries: (scopeId) => pending[scopeId] || [],
    buildSteeringInput: (entries) => entries.map((entry) => entry.text).join("\n"),
    consumeEntries: (scopeId, entries) => {
      const ids = new Set(entries.map((entry) => entry.id));
      const before = pending[scopeId].length;
      pending[scopeId] = pending[scopeId].filter((entry) => !ids.has(entry.id));
      return before - pending[scopeId].length;
    }
  });

  const result = await coordinator.schedule("group");
  assert.equal(result.ok, true);
  assert.equal(result.consumedCount, 2);
  assert.equal(steered[0], "first\nsecond");

  await waitFor(() => steered.length === 2);
  assert.equal(steered[1], "arrived during steer");
  assert.deepEqual(pending.group, []);
  coordinator.close();
});

test("keeps pending entries when the active turn cannot accept steering", async () => {
  const pending = { group: [{ id: "one", text: "first" }] };
  const generation = {
    id: "generation-1",
    steer: async () => {
      const error = new Error("too late");
      error.code = "CODEX_TURN_NOT_ACTIVE";
      throw error;
    }
  };
  const coordinator = createQqReplySteeringCoordinator({
    delayMs: 0,
    getActiveGeneration: () => generation,
    getPendingEntries: (scopeId) => pending[scopeId] || [],
    buildSteeringInput: (entries) => entries.map((entry) => entry.text).join("\n"),
    consumeEntries: () => {
      throw new Error("must not consume failed steering");
    }
  });

  const result = await coordinator.schedule("group");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "CODEX_TURN_NOT_ACTIVE");
  assert.equal(pending.group.length, 1);
  coordinator.close();
});

test("resets the fusion window so bursty triggers reach the model as one steer", async () => {
  const pending = { group: [{ id: "one", text: "first" }] };
  const steered = [];
  const generation = {
    id: "generation-1",
    steer: async (input) => {
      steered.push(input);
      return { threadId: "thread-1", turnId: "turn-1" };
    }
  };
  const coordinator = createQqReplySteeringCoordinator({
    delayMs: 30,
    maxDelayMs: 100,
    getActiveGeneration: () => generation,
    getPendingEntries: (scopeId) => pending[scopeId] || [],
    buildSteeringInput: (entries) => entries.map((entry) => entry.text).join("\n"),
    consumeEntries: (scopeId, entries) => {
      const ids = new Set(entries.map((entry) => entry.id));
      pending[scopeId] = pending[scopeId].filter((entry) => !ids.has(entry.id));
      return entries.length;
    }
  });

  const scheduled = coordinator.schedule("group");
  await new Promise((resolve) => setTimeout(resolve, 15));
  pending.group.push({ id: "two", text: "second" });
  coordinator.schedule("group");
  await new Promise((resolve) => setTimeout(resolve, 15));
  pending.group.push({ id: "three", text: "third" });
  coordinator.schedule("group");

  const result = await scheduled;
  assert.equal(result.ok, true);
  assert.deepEqual(steered, ["first\nsecond\nthird"]);
  assert.deepEqual(pending.group, []);
  coordinator.close();
});

async function waitFor(predicate, timeoutMs = 1_000) {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) throw new Error("condition was not met");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

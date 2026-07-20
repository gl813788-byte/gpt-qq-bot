import assert from "node:assert/strict";
import test from "node:test";
import {
  applyQqKnowledgePatches,
  createEmptyQqKnowledgeBase,
  findQqKnowledgeMatches,
  recordQqKnowledgeUsage
} from "../src/qq-knowledge-base.js";
import {
  buildQqKnowledgeMatchLogDetails,
  buildQqKnowledgePatchLogDetails,
  buildQqKnowledgeStoreLogDetails
} from "../src/qq-knowledge-log.js";

test("knowledge log summaries retain actions and scopes without copying knowledge content", () => {
  const applied = applyQqKnowledgePatches(createEmptyQqKnowledgeBase(), [{
    kind: "slang",
    title: "测试词",
    content: "不应进入日志的完整解释",
    scope: "group"
  }], {
    groupId: "10001",
    groupName: "测试群",
    senderId: "20002",
    senderName: "测试人"
  }, { sourceType: "chat-summary" });
  const details = buildQqKnowledgePatchLogDetails(applied, {
    source: "chat-summary",
    groupId: "10001",
    senderId: "20002"
  });

  assert.equal(details.outcome, "updated");
  assert.equal(details.appliedCount, 1);
  assert.deepEqual(details.actionCounts, { added: 1 });
  assert.deepEqual(details.kindCounts, { slang: 1 });
  assert.equal(details.items[0].scope.type, "group");
  assert.equal(JSON.stringify(details).includes("不应进入日志的完整解释"), false);

  const store = buildQqKnowledgeStoreLogDetails(applied.store, { source: "startup" });
  assert.equal(store.titleCount, 1);
  assert.equal(store.slangCount, 1);
  assert.equal(store.variantCount, 1);
});

test("slang usage returns bounded metadata for one detailed structured log", () => {
  const applied = applyQqKnowledgePatches(createEmptyQqKnowledgeBase(), [{
    kind: "slang",
    title: "测试词",
    content: "群内含义",
    scope: "group"
  }], { groupId: "10001", groupName: "测试群" });
  const matches = findQqKnowledgeMatches(applied.store, {
    text: "刚才又说测试词了",
    groupId: "10001",
    senderId: "20002"
  });
  const usage = recordQqKnowledgeUsage(applied.store, matches, {
    scopeId: "10001",
    groupId: "10001",
    senderId: "20002",
    messageId: "30003",
    text: "刚才又说测试词了"
  }, { at: "2026-07-20T12:00:00.000Z" });
  const details = buildQqKnowledgeMatchLogDetails(matches, usage, {
    groupId: "10001",
    senderId: "20002",
    messageId: "30003"
  });

  assert.equal(usage.recorded.length, 1);
  assert.equal(details.outcome, "recorded");
  assert.equal(details.recordedHitCount, 1);
  assert.equal(details.hits[0].hitCount, 1);
  assert.equal(details.hits[0].scope.type, "group");
  assert.equal(JSON.stringify(details).includes("群内含义"), false);
});

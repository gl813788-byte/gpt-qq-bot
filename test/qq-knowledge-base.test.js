import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  applyQqKnowledgeDeletionReview,
  applyQqKnowledgePatches,
  createEmptyQqKnowledgeBase,
  createQqKnowledgeBaseRepository,
  extractQqKnowledgeMarkers,
  findQqKnowledgeMatches,
  formatQqKnowledgeEntries,
  getDueQqKnowledgeDeletionReviews,
  listQqKnowledgeEntries,
  recordQqKnowledgeUsage
} from "../src/qq-knowledge-base.js";

const alice = { senderId: "10001", senderName: "爱丽丝" };

function addKnowledge(store, patch, context, at = "2025-01-01T00:00:00.000Z") {
  return applyQqKnowledgePatches(store, [patch], context, { at, sourceType: "test" });
}

test("keeps the same slang title scoped to different QQ groups", () => {
  let store = createEmptyQqKnowledgeBase();
  store = addKnowledge(store, {
    kind: "slang",
    title: "开香槟",
    content: "事情还没成就提前庆祝",
    scope: "group"
  }, { ...alice, groupId: "20001", groupName: "施工群" }).store;
  store = addKnowledge(store, {
    kind: "slang",
    title: "开香槟",
    content: "今晚一起喝饮料的暗号",
    scope: "group"
  }, { ...alice, groupId: "20002", groupName: "饭友群" }).store;

  const first = findQqKnowledgeMatches(store, {
    text: "这就开香槟了？",
    groupId: "20001",
    senderId: alice.senderId
  });
  const second = findQqKnowledgeMatches(store, {
    text: "要不要开香槟",
    groupId: "20002",
    senderId: alice.senderId
  });

  assert.equal(first.length, 1);
  assert.equal(first[0].variants[0].content, "事情还没成就提前庆祝");
  assert.equal(first[0].variants[0].scope.groupName, "施工群");
  assert.equal(second[0].variants[0].content, "今晚一起喝饮料的暗号");
  assert.equal(second[0].variants[0].scope.groupName, "饭友群");
});

test("promotes one person's identical cross-group interpretation and keeps different interpretations local", () => {
  let store = createEmptyQqKnowledgeBase();
  store = addKnowledge(store, {
    kind: "slang",
    title: "上车",
    content: "加入这次活动",
    scope: "group-member"
  }, { ...alice, groupId: "20001", groupName: "一群" }).store;
  store = addKnowledge(store, {
    kind: "slang",
    title: "上车",
    content: "加入这次活动",
    scope: "group-member"
  }, { ...alice, groupId: "20002", groupName: "二群" }).store;
  store = addKnowledge(store, {
    kind: "slang",
    title: "上车",
    content: "加入这次活动",
    scope: "group-member"
  }, { ...alice, groupId: "20003", groupName: "三群" }).store;

  let entry = store.entries[0];
  assert.equal(entry.variants.length, 1);
  assert.equal(entry.variants[0].scope.type, "member");
  assert.equal(entry.variants[0].scope.userId, alice.senderId);
  assert.deepEqual(entry.variants[0].scope.groups.map((group) => group.groupId), ["20001", "20002", "20003"]);

  store = addKnowledge(store, {
    kind: "slang",
    title: "上车",
    content: "真的乘坐汽车",
    scope: "group-member"
  }, { ...alice, groupId: "20004", groupName: "自驾群" }).store;
  entry = store.entries[0];
  assert.equal(entry.variants.length, 2);
  const local = findQqKnowledgeMatches(store, {
    text: "我准备上车",
    groupId: "20004",
    senderId: alice.senderId
  });
  const shared = findQqKnowledgeMatches(store, {
    text: "现在上车吗",
    groupId: "20005",
    senderId: alice.senderId
  });
  assert.equal(local[0].variants[0].content, "真的乘坐汽车");
  assert.equal(shared[0].variants[0].content, "加入这次活动");

  const currentRange = listQqKnowledgeEntries(store, {
    range: { type: "current", groupId: "20001", userId: alice.senderId }
  });
  assert.equal(currentRange[0].variants.some((variant) => variant.scope.groupId === "20004"), false);
  const summaryRange = listQqKnowledgeEntries(store, {
    range: { type: "scope-summary", groupId: "20001" }
  });
  assert.equal(summaryRange[0].variants.some((variant) => variant.scope.type === "member"), true);
  assert.equal(summaryRange[0].variants.some((variant) => variant.scope.groupId === "20004"), false);
});

test("updates existing knowledge instead of growing duplicate titles", () => {
  let store = createEmptyQqKnowledgeBase();
  const context = { ...alice, groupId: "20001", groupName: "施工群" };
  store = addKnowledge(store, {
    kind: "note",
    title: "发版时间",
    content: "周三晚上",
    scope: "group"
  }, context).store;
  store = addKnowledge(store, {
    kind: "note",
    title: "发版时间",
    content: "改成周五晚上",
    scope: "group"
  }, context, "2025-01-02T00:00:00.000Z").store;
  store = addKnowledge(store, {
    kind: "note",
    title: "每周发版安排",
    content: "改成周五晚上",
    scope: "group"
  }, context, "2025-01-03T00:00:00.000Z").store;
  store = addKnowledge(store, {
    kind: "note",
    title: "正式发版安排",
    replacesTitle: "每周发版安排",
    content: "最终定在周六下午",
    scope: "group"
  }, context, "2025-01-04T00:00:00.000Z").store;

  assert.equal(store.entries.length, 1);
  assert.equal(store.entries[0].title, "正式发版安排");
  assert.deepEqual(store.entries[0].aliases, ["发版时间", "每周发版安排"]);
  assert.equal(store.entries[0].variants.length, 1);
  assert.equal(store.entries[0].variants[0].content, "最终定在周六下午");
  assert.match(formatQqKnowledgeEntries(store.entries), /知识条目更新于 2025-01-04T00:00:00.000Z/);

  const rejected = addKnowledge(store, { kind: "note", content: "没有标题" }, context);
  assert.equal(rejected.rejected.length, 1);
});

test("strips hidden knowledge markers and ignores malformed metadata", () => {
  const parsed = extractQqKnowledgeMarkers([
    "可见回复",
    '[[qq_knowledge:{"kind":"slang","title":"芜湖","content":"表示兴奋"}]]',
    "[[qq_kb:{bad json}]]"
  ].join("\n"));
  assert.equal(parsed.visibleText, "可见回复");
  assert.equal(parsed.patches.length, 1);
  assert.equal(parsed.patches[0].title, "芜湖");
});

test("tracks slang frequency with surrounding chat and requires interest-model confirmation before deletion", () => {
  const context = { ...alice, groupId: "20001", groupName: "施工群" };
  let store = addKnowledge(createEmptyQqKnowledgeBase(), {
    kind: "slang",
    title: "挖土",
    content: "开始写代码",
    scope: "group"
  }, context, "2025-01-01T00:00:00.000Z").store;

  for (let day = 2; day <= 4; day += 1) {
    const at = `2025-01-0${day}T00:00:00.000Z`;
    const matches = findQqKnowledgeMatches(store, {
      text: "今晚继续挖土",
      groupId: context.groupId,
      senderId: context.senderId
    });
    store = recordQqKnowledgeUsage(store, matches, {
      ...context,
      at,
      messageId: `message-${day}`,
      text: "今晚继续挖土",
      recentMessages: [{
        at,
        messageId: `before-${day}`,
        senderId: "10002",
        senderName: "鲍勃",
        text: "项目还有两个 bug"
      }]
    }, { at }).store;
  }
  store = recordQqKnowledgeUsage(store, [], {
    ...context,
    messageId: "after-message",
    text: "那先修登录问题"
  }, { at: "2025-01-04T00:05:00.000Z" }).store;

  const [candidate] = getDueQqKnowledgeDeletionReviews(store, {
    now: Date.parse("2025-04-20T00:00:00.000Z"),
    limit: 1
  });
  assert.ok(candidate);
  assert.equal(candidate.usage.hitCount, 3);
  assert.equal(candidate.usage.occurrences.length, 3);
  assert.equal(candidate.usage.occurrences[0].before[0].text, "项目还有两个 bug");
  assert.equal(candidate.usage.occurrences.at(-1).after[0].text, "那先修登录问题");

  const kept = applyQqKnowledgeDeletionReview(store, candidate, {
    delete: false,
    reason: "虽然低频，但含义稳定",
    requestedAt: "2025-04-20T00:00:00.000Z"
  }, { at: "2025-04-20T00:01:00.000Z" });
  assert.equal(kept.deleted, false);
  assert.equal(kept.outcome, "kept");
  assert.equal(kept.modelDecision, "keep");
  assert.equal(kept.staleGuardApplied, false);
  assert.equal(kept.store.entries.length, 1);
  assert.equal(kept.store.reviewHistory[0].decision, "keep");

  const freshMatches = findQqKnowledgeMatches(store, {
    text: "又要挖土了",
    groupId: context.groupId,
    senderId: context.senderId
  });
  const active = recordQqKnowledgeUsage(store, freshMatches, {
    ...context,
    messageId: "new-activity",
    text: "又要挖土了"
  }, { at: "2025-04-21T00:00:00.000Z" }).store;
  const guarded = applyQqKnowledgeDeletionReview(active, candidate, {
    delete: true,
    reason: "申请删除"
  }, { at: "2025-04-21T00:01:00.000Z" });
  assert.equal(guarded.deleted, false);
  assert.equal(guarded.outcome, "kept_due_to_activity");
  assert.equal(guarded.modelDecision, "delete");
  assert.equal(guarded.staleGuardApplied, true);
  assert.match(guarded.history.reason, /新活动或内容更新/);
});

test("keeps retained surrounding context isolated between private chats", () => {
  let store = addKnowledge(createEmptyQqKnowledgeBase(), {
    kind: "slang",
    title: "收工",
    content: "今天不再继续这个话题",
    scope: "member"
  }, alice).store;
  const matches = findQqKnowledgeMatches(store, {
    text: "那就收工",
    senderId: alice.senderId
  });
  store = recordQqKnowledgeUsage(store, matches, {
    scopeId: `private:${alice.senderId}`,
    senderId: alice.senderId,
    senderName: alice.senderName,
    messageId: "alice-message",
    text: "那就收工"
  }).store;
  store = recordQqKnowledgeUsage(store, [], {
    scopeId: "private:10002",
    senderId: "10002",
    senderName: "鲍勃",
    messageId: "bob-message",
    text: "另一个私聊的消息"
  }).store;
  assert.equal(store.entries[0].variants[0].usage.occurrences[0].after.length, 0);

  store = recordQqKnowledgeUsage(store, [], {
    scopeId: `private:${alice.senderId}`,
    senderName: "Bot",
    messageId: "assistant-message",
    text: "行，先到这"
  }).store;
  assert.equal(store.entries[0].variants[0].usage.occurrences[0].after[0].text, "行，先到这");
});

test("blocks writes and preserves a malformed persisted knowledge file", async () => {
  const directory = await mkdtemp(join(tmpdir(), "qq-kb-test-"));
  const filePath = join(directory, "knowledge.json");
  await writeFile(filePath, "{not valid json", "utf8");
  const repository = createQqKnowledgeBaseRepository({ filePath });
  await assert.rejects(repository.load());
  assert.equal(repository.writable, false);
  assert.equal(await readFile(filePath, "utf8"), "{not valid json");
  await rm(directory, { recursive: true, force: true });
});

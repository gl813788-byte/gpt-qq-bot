import assert from "node:assert/strict";
import test from "node:test";
import {
  buildQqOutgoingMentionSegments,
  createQqOutgoingMentionResolver
} from "../src/qq-outgoing-mentions.js";

test("turns exact QQ names and numbers into real at segments with one following space", () => {
  const result = buildQqOutgoingMentionSegments(
    "@小明 你看一下，@123456 也来看看",
    {
      identities: [{ userId: "10001", card: "小明" }]
    }
  );

  assert.deepEqual(result.mentionIds, ["10001", "123456"]);
  assert.deepEqual(result.segments, [
    { type: "at", data: { qq: "10001" } },
    { type: "text", data: { text: " 你看一下，" } },
    { type: "at", data: { qq: "123456" } },
    { type: "text", data: { text: " 也来看看" } }
  ]);
});

test("supports multi-word names, uses the longest exact name, and skips self mentions", () => {
  const result = buildQqOutgoingMentionSegments(
    "请 @Alice Smith 处理，@Alice 旁观，@99999 不用重复叫自己",
    {
      selfId: "99999",
      identities: [
        { userId: "10001", card: "Alice" },
        { userId: "10002", card: "Alice Smith" }
      ]
    }
  );

  assert.deepEqual(result.mentionIds, ["10002", "10001"]);
  assert.equal(result.segments.some((segment) => segment.type === "at" && segment.data.qq === "99999"), false);
  assert.equal(result.segments.at(-1).data.text.includes("@99999"), true);
});

test("keeps ambiguous and unknown names as visible text instead of mentioning the wrong person", () => {
  const result = buildQqOutgoingMentionSegments(
    "@同名 先看，邮箱 test@example.com，@不存在 也保留",
    {
      identities: [
        { userId: "10001", card: "同名" },
        { userId: "10002", card: "同名" }
      ]
    }
  );

  assert.deepEqual(result.mentionIds, []);
  assert.deepEqual(result.segments, [{
    type: "text",
    data: { text: "@同名 先看，邮箱 test@example.com，@不存在 也保留" }
  }]);
  assert.deepEqual(result.unresolvedMentions, ["@同名", "@example", "@不存在"]);
});

test("loads and caches group member names only for replies containing at syntax", async () => {
  let calls = 0;
  const resolver = createQqOutgoingMentionResolver({
    loadGroupMembers: async () => {
      calls += 1;
      return [{ user_id: 20001, card: "群名片", nickname: "昵称" }];
    }
  });

  const plain = await resolver.resolve({ groupId: "30001", text: "普通消息" });
  const first = await resolver.resolve({ groupId: "30001", text: "@群名片 你好" });
  const second = await resolver.resolve({ groupId: "30001", text: "@昵称 也你好" });

  assert.equal(calls, 1);
  assert.deepEqual(plain.mentionIds, []);
  assert.deepEqual(first.mentionIds, ["20001"]);
  assert.deepEqual(second.mentionIds, ["20001"]);
});

test("falls back to local identities when the OneBot member lookup fails", async () => {
  const resolver = createQqOutgoingMentionResolver({
    loadGroupMembers: async () => {
      throw new Error("OneBot unavailable");
    }
  });
  const result = await resolver.resolve({
    groupId: "30001",
    text: "@当前发送者 收到",
    localIdentities: [{ userId: "10001", name: "当前发送者" }]
  });

  assert.deepEqual(result.mentionIds, ["10001"]);
  assert.match(result.loadError.message, /OneBot unavailable/);
});

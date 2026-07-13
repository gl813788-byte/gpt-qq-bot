import assert from "node:assert/strict";
import test from "node:test";
import {
  createEmptyQqConversationMemory,
  extractQqConversationMemoryMarkers,
  formatQqConversationMemoryContext,
  updateQqConversationMemoryFromEvent,
  updateQqConversationMemoryFromExchange
} from "../src/qq-conversation-memory.js";

test("tracks group topics, people, links, impressions and bot thoughts", () => {
  let tick = 0;
  const now = () => new Date(Date.UTC(2026, 6, 13, 10, 0, tick++));
  let memory = createEmptyQqConversationMemory();
  const event = {
    groupId: "10001",
    senderId: "20002",
    senderName: "群友甲",
    text: "最近在优化 Agent 上下文 https://example.test/design",
    contentContext: {
      displayText: "最近在优化 Agent 上下文 https://example.test/design",
      links: ["https://example.test/design"]
    }
  };

  memory = updateQqConversationMemoryFromEvent(memory, event, { now });
  memory = updateQqConversationMemoryFromExchange(memory, event, "近处完整、远处相关会更稳。", [{
    scopeImpression: "这个群常讨论 Bot 和技术优化",
    personImpression: "喜欢从体验角度改进 Agent",
    recentTopic: "上下文分层",
    botThought: "这次需求很具体，适合逐步落地"
  }], { now });

  const group = memory.groups["10001"];
  assert.equal(group.impression, "这个群常讨论 Bot 和技术优化");
  assert.equal(group.people["20002"].impression, "喜欢从体验角度改进 Agent");
  assert.equal(group.recentLinks[0].host, "example.test");
  assert.match(formatQqConversationMemoryContext(memory, event), /Bot 最近对群聊的感想/);
});

test("tracks private-chat impressions and strips invisible model memory metadata", () => {
  const event = {
    type: "private_message",
    senderId: "30003",
    senderName: "私聊用户",
    text: "最近我们聊了记忆功能"
  };
  let memory = updateQqConversationMemoryFromEvent(createEmptyQqConversationMemory(), event);
  const parsed = extractQqConversationMemoryMarkers(
    "这个思路可以。\n[[qq_memory:{\"personImpression\":\"很重视连续聊天体验\",\"recentTopic\":\"私聊记忆\",\"botThought\":\"交流很顺畅\"}]]"
  );
  assert.equal(parsed.visibleText, "这个思路可以。");
  assert.equal(parsed.patches.length, 1);

  memory = updateQqConversationMemoryFromExchange(memory, event, parsed.visibleText, parsed.patches);
  assert.equal(memory.privateChats["30003"].impression, "很重视连续聊天体验");
  assert.match(formatQqConversationMemoryContext(memory, event), /最近聊过：.*私聊记忆/);

  const sensitive = extractQqConversationMemoryMarkers(
    "可见回复\n[[qq_memory:{\"botThought\":\"API_KEY=sk-secret-value-12345\"}]]"
  );
  assert.equal(sensitive.visibleText, "可见回复");
  assert.deepEqual(sensitive.patches, []);
});

test("never exposes malformed invisible memory metadata to QQ", () => {
  const parsed = extractQqConversationMemoryMarkers("正常回复\n[[qq_memory:{bad json}]]");
  assert.equal(parsed.visibleText, "正常回复");
  assert.deepEqual(parsed.patches, []);
});

test("does not persist likely secrets and strips sensitive URL parameters", () => {
  const event = {
    type: "private_message",
    senderId: "40004",
    senderName: "私聊用户",
    text: "验证码: 123456 https://example.test/callback?article=8&access_token=secret123#fragment",
    contentContext: {
      displayText: "验证码: 123456 https://example.test/callback?article=8&access_token=secret123#fragment",
      links: ["https://example.test/callback?article=8&access_token=secret123#fragment"]
    }
  };
  const memory = updateQqConversationMemoryFromEvent(createEmptyQqConversationMemory(), event);
  const chat = memory.privateChats["40004"];
  assert.deepEqual(chat.recentMessages, []);
  assert.equal(chat.recentLinks[0].url, "https://example.test/callback?article=8");
});

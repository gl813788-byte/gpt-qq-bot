import assert from "node:assert/strict";
import test from "node:test";
import {
  applyGeneratedQqSelfPersona,
  applyQqSelfPersonaScopeSummary,
  buildQqSelfPersonaGenerationPrompt,
  buildQqSelfPersonaScopeSummaryPrompt,
  createEmptyQqSelfPersona,
  formatQqSelfPersonaContext,
  formatQqSelfPersonaScopeTopicContext,
  getDueQqSelfPersonaScopes,
  matchQqSelfPersonaInterestKeywords,
  parseQqSelfPersonaJson,
  recordQqSelfPersonaActivity,
  shouldRegenerateQqSelfPersona,
  updateQqSelfPersonaAccount
} from "../src/qq-self-persona.js";

test("scope summaries keep QQ identity only in long-term knowledge extraction", () => {
  const prompt = buildQqSelfPersonaScopeSummaryPrompt("20001", [{
    senderId: "10001",
    senderName: "爱丽丝",
    text: "今晚挖土，就是继续写代码"
  }], {
    botName: "小星",
    groupName: "施工群",
    existingKnowledge: "[黑话] 挖土：开始写代码",
    previousSummary: "这个群长期讨论协作项目与发布安排。",
    previousTopics: ["协作项目", "发布安排"],
    currentDate: "2026-07-21"
  });
  assert.match(prompt, /speakerQq/);
  assert.match(prompt, /10001/);
  assert.match(prompt, /施工群/);
  assert.match(prompt, /existingKnowledge/);
  assert.match(prompt, /不要匿名化/);
  assert.match(prompt, /group-member/);
  assert.match(prompt, /实际的主要话题/);
  assert.match(prompt, /不得预设任何固定领域/);
  assert.match(prompt, /2026-07-21/);
  assert.match(prompt, /会话待核查/);
  assert.match(prompt, /稳定标题/);
  assert.match(prompt, /previousScope 是上轮范围摘要与主要话题/);
  const payload = JSON.parse(prompt.split("\n").at(-1));
  assert.equal(payload.previousScope.summary, "这个群长期讨论协作项目与发布安排。");
  assert.deepEqual(payload.previousScope.topics, ["协作项目", "发布安排"]);

  const privatePrompt = buildQqSelfPersonaScopeSummaryPrompt("private:10001", [], {});
  assert.match(privatePrompt, /个人黑话用 member/);
  assert.doesNotMatch(privatePrompt, /群通用解释用 group/);
});

test("scope summary prompt compresses adjacent repeated chat messages", () => {
  const prompt = buildQqSelfPersonaScopeSummaryPrompt("20001", [
    { messageId: "1", senderId: "10001", senderName: "甲", text: "今晚挖土" },
    { messageId: "2", senderId: "10002", senderName: "乙", text: "今晚挖土" },
    { messageId: "3", senderId: "10003", senderName: "丙", text: "今晚挖土" }
  ], { botName: "小星", groupName: "施工群" });
  const payload = JSON.parse(prompt.split("\n").at(-1));
  assert.equal(payload.messages.length, 1);
  assert.equal(payload.messages[0].speakerQq, "10003");
  assert.equal(payload.messages[0].text, "今晚挖土（连续重复 3 条）");
});

test("QQ nickname is a fixed interest keyword across generated persona updates", () => {
  let store = updateQqSelfPersonaAccount(createEmptyQqSelfPersona(), {
    userId: "123456",
    nickname: "小星"
  }).store;
  store = applyGeneratedQqSelfPersona(store, {
    name: "模型乱改的名字",
    selfDescription: "喜欢研究技术，也喜欢看有意思的图。",
    interestKeywords: ["编程", "表情包"],
    interestParagraph: "遇到新工具、难解故障和有创意的图片时会很想参与。",
    interests: [{ topic: "编程排障", weight: 90, description: "喜欢找到具体原因" }]
  });
  assert.equal(store.persona.name, "小星");
  assert.equal(store.persona.interestKeywords[0], "小星");
  assert.equal(matchQqSelfPersonaInterestKeywords(store, "小星来看看这个编程 bug").matched, true);
  assert.equal(matchQqSelfPersonaInterestKeywords(store, "小星来看看这个编程 bug").nameMatched, true);
  assert.deepEqual(matchQqSelfPersonaInterestKeywords(store, "这个编程 bug").keywords, ["编程"]);
  assert.match(formatQqSelfPersonaContext(store), /完整兴趣描述/);
});

test("scope topic context gives the main model evolving summary-derived knowledge topics", () => {
  const startedAt = Date.UTC(2026, 6, 15, 8, 0);
  let store = recordQqSelfPersonaActivity(createEmptyQqSelfPersona(), "20001", {
    humanMessages: 80,
    at: startedAt
  });
  store = applyQqSelfPersonaScopeSummary(store, "20001", {
    summary: "这个群长期交流协作项目的进展和实际经验。",
    topics: ["协作项目", "实际经验"]
  }, { at: startedAt });
  const context = formatQqSelfPersonaScopeTopicContext(store, "20001");
  assert.match(context, /当前范围的长期摘要/);
  assert.match(context, /协作项目、实际经验/);
  assert.match(context, /话题已变化就调整归类/);
  assert.match(context, /不要预设任何领域/);
  assert.equal(formatQqSelfPersonaScopeTopicContext(store, "99999"), "");
});

test("scope summaries are due by bounded message/reply thresholds and feed global generation", () => {
  const startedAt = Date.UTC(2026, 6, 15, 8, 0);
  let store = createEmptyQqSelfPersona();
  store = recordQqSelfPersonaActivity(store, "10001", { humanMessages: 96, botReplies: 24, at: startedAt });
  store = recordQqSelfPersonaActivity(store, "private:20001", { humanMessages: 64, botReplies: 0, at: startedAt });
  const due = getDueQqSelfPersonaScopes(store, {
    minInitialMessages: 64,
    messagesPerSummary: 96,
    botRepliesPerSummary: 24,
    now: startedAt,
    limit: 4
  });
  assert.equal(due.length, 2);
  store = applyQqSelfPersonaScopeSummary(store, "10001", {
    summary: "Bot 对技术排障持续有兴趣。",
    topics: ["Node", "部署"],
    botInterests: ["定位真实报错原因"]
  }, { at: startedAt });
  store = applyQqSelfPersonaScopeSummary(store, "private:20001", {
    summary: "Bot 喜欢自然短聊和图片话题。",
    topics: ["图片"],
    interactionStyle: ["短句"]
  }, { at: startedAt });
  const generation = shouldRegenerateQqSelfPersona(store, {
    minScopeSummaries: 2,
    minInitialMessages: 160,
    now: startedAt
  });
  assert.equal(generation.due, true);
  const prompt = buildQqSelfPersonaGenerationPrompt(updateQqSelfPersonaAccount(store, { nickname: "小星" }).store);
  assert.match(prompt, /interestKeywords/);
  assert.match(prompt, /必须包含“小星”/);
  assert.doesNotMatch(prompt, /private:20001|10001/);
});

test("higher activity thresholds combine with shorter wall-clock cooldowns", () => {
  const startedAt = Date.UTC(2026, 6, 15, 8, 0);
  let store = updateQqSelfPersonaAccount(createEmptyQqSelfPersona(), { nickname: "小星", at: startedAt }).store;
  store = recordQqSelfPersonaActivity(store, "10001", { humanMessages: 96, botReplies: 24, at: startedAt });
  store = applyQqSelfPersonaScopeSummary(store, "10001", { summary: "初次摘要" }, { at: startedAt });
  store = applyGeneratedQqSelfPersona(store, {
    name: "小星",
    interestKeywords: ["小星", "AI"],
    interestParagraph: "喜欢研究 AI。"
  }, { at: startedAt });
  store = recordQqSelfPersonaActivity(store, "10001", { humanMessages: 95, botReplies: 23, at: startedAt + 60_000 });
  assert.equal(getDueQqSelfPersonaScopes(store, {
    now: startedAt + 5 * 60 * 60 * 1000
  }).length, 0);
  assert.equal(shouldRegenerateQqSelfPersona(store, {
    now: startedAt + 13 * 60 * 60 * 1000
  }).due, false);
  store = recordQqSelfPersonaActivity(store, "10001", { humanMessages: 225, botReplies: 57, at: startedAt + 120_000 });

  assert.equal(getDueQqSelfPersonaScopes(store, {
    now: startedAt + 3 * 60 * 60 * 1000,
    minHoursBetweenSummaries: 4
  }).length, 0);
  assert.equal(getDueQqSelfPersonaScopes(store, {
    now: startedAt + 4 * 60 * 60 * 1000,
    minHoursBetweenSummaries: 4
  }).length, 1);

  const earlyGeneration = shouldRegenerateQqSelfPersona(store, {
    now: startedAt + 11 * 60 * 60 * 1000,
    minHoursBetweenGenerations: 12
  });
  assert.equal(earlyGeneration.updateThresholdReached, true);
  assert.equal(earlyGeneration.due, false);
  const dueGeneration = shouldRegenerateQqSelfPersona(store, {
    now: startedAt + 12 * 60 * 60 * 1000,
    minHoursBetweenGenerations: 12
  });
  assert.equal(dueGeneration.due, true);
});

test("an overdue persona refresh restarts its cooldown from catch-up completion", () => {
  const originalAt = Date.UTC(2026, 6, 15, 8, 0);
  const catchUpCompletedAt = originalAt + 10 * 60 * 60 * 1000;
  let store = createEmptyQqSelfPersona();
  store = recordQqSelfPersonaActivity(store, "10001", {
    humanMessages: 64,
    at: originalAt
  });
  store = applyQqSelfPersonaScopeSummary(store, "10001", {
    summary: "停机后补做的摘要"
  }, { at: catchUpCompletedAt });
  store = recordQqSelfPersonaActivity(store, "10001", {
    humanMessages: 96,
    at: catchUpCompletedAt + 1
  });
  assert.equal(getDueQqSelfPersonaScopes(store, {
    now: catchUpCompletedAt + 4 * 60 * 60 * 1000 - 1,
    minHoursBetweenSummaries: 4
  }).length, 0);
  assert.equal(getDueQqSelfPersonaScopes(store, {
    now: catchUpCompletedAt + 4 * 60 * 60 * 1000,
    minHoursBetweenSummaries: 4
  }).length, 1);
});

test("parses the final persona JSON instead of earlier analysis", () => {
  const parsed = parseQqSelfPersonaJson([
    "ANALYSIS: 前面可能出现 {无效内容}",
    'FINAL_JSON: {"name":"小星","interestKeywords":["小星","AI"],"interestParagraph":"对 AI 新进展很感兴趣"}'
  ].join("\n"));
  assert.equal(parsed.name, "小星");
  assert.deepEqual(parsed.interestKeywords, ["小星", "AI"]);
});

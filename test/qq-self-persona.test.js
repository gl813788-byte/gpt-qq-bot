import assert from "node:assert/strict";
import test from "node:test";
import {
  applyGeneratedQqSelfPersona,
  applyQqSelfPersonaScopeSummary,
  buildQqSelfPersonaGenerationPrompt,
  createEmptyQqSelfPersona,
  formatQqSelfPersonaContext,
  getDueQqSelfPersonaScopes,
  matchQqSelfPersonaInterestKeywords,
  parseQqSelfPersonaJson,
  recordQqSelfPersonaActivity,
  shouldRegenerateQqSelfPersona,
  updateQqSelfPersonaAccount
} from "../src/qq-self-persona.js";

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

test("scope summaries are due by bounded message/reply thresholds and feed global generation", () => {
  const startedAt = Date.UTC(2026, 6, 15, 8, 0);
  let store = createEmptyQqSelfPersona();
  store = recordQqSelfPersonaActivity(store, "10001", { humanMessages: 48, botReplies: 12, at: startedAt });
  store = recordQqSelfPersonaActivity(store, "private:20001", { humanMessages: 32, botReplies: 0, at: startedAt });
  const due = getDueQqSelfPersonaScopes(store, {
    minInitialMessages: 32,
    messagesPerSummary: 48,
    botRepliesPerSummary: 12,
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
    minInitialMessages: 80,
    now: startedAt
  });
  assert.equal(generation.due, true);
  const prompt = buildQqSelfPersonaGenerationPrompt(updateQqSelfPersonaAccount(store, { nickname: "小星" }).store);
  assert.match(prompt, /interestKeywords/);
  assert.match(prompt, /必须包含“小星”/);
  assert.doesNotMatch(prompt, /private:20001|10001/);
});

test("scope and global persona refreshes respect longer wall-clock cooldowns", () => {
  const startedAt = Date.UTC(2026, 6, 15, 8, 0);
  let store = updateQqSelfPersonaAccount(createEmptyQqSelfPersona(), { nickname: "小星", at: startedAt }).store;
  store = recordQqSelfPersonaActivity(store, "10001", { humanMessages: 48, botReplies: 12, at: startedAt });
  store = applyQqSelfPersonaScopeSummary(store, "10001", { summary: "初次摘要" }, { at: startedAt });
  store = applyGeneratedQqSelfPersona(store, {
    name: "小星",
    interestKeywords: ["小星", "AI"],
    interestParagraph: "喜欢研究 AI。"
  }, { at: startedAt });
  store = recordQqSelfPersonaActivity(store, "10001", { humanMessages: 160, botReplies: 40, at: startedAt + 60_000 });

  assert.equal(getDueQqSelfPersonaScopes(store, {
    now: startedAt + 11 * 60 * 60 * 1000,
    minHoursBetweenSummaries: 12
  }).length, 0);
  assert.equal(getDueQqSelfPersonaScopes(store, {
    now: startedAt + 12 * 60 * 60 * 1000,
    minHoursBetweenSummaries: 12
  }).length, 1);

  const earlyGeneration = shouldRegenerateQqSelfPersona(store, {
    now: startedAt + 47 * 60 * 60 * 1000,
    minHoursBetweenGenerations: 48
  });
  assert.equal(earlyGeneration.updateThresholdReached, true);
  assert.equal(earlyGeneration.due, false);
  const dueGeneration = shouldRegenerateQqSelfPersona(store, {
    now: startedAt + 48 * 60 * 60 * 1000,
    minHoursBetweenGenerations: 48
  });
  assert.equal(dueGeneration.due, true);
});

test("parses the final persona JSON instead of earlier analysis", () => {
  const parsed = parseQqSelfPersonaJson([
    "ANALYSIS: 前面可能出现 {无效内容}",
    'FINAL_JSON: {"name":"小星","interestKeywords":["小星","AI"],"interestParagraph":"对 AI 新进展很感兴趣"}'
  ].join("\n"));
  assert.equal(parsed.name, "小星");
  assert.deepEqual(parsed.interestKeywords, ["小星", "AI"]);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  buildQqKnowledgeInterestTriagePayload,
  formatQqKnowledgeMainDeletionReviewPrompt,
  parseQqKnowledgeMainDeletionReview
} from "../src/qq-knowledge-review.js";

function application() {
  return {
    requestedAt: "2026-07-20T10:00:00.000Z",
    title: "挖土",
    aliases: ["开挖"],
    currentMeaning: "开始排查一个难定位的问题",
    scope: { type: "group", groupId: "10001", groupName: "测试群" },
    frequency: { totalHits: 12, recentHits: 0, recentWindowDays: 30 },
    retainedOccurrences: Array.from({ length: 10 }, (_, index) => ({
      at: `2026-0${Math.min(index + 1, 9)}-01T00:00:00.000Z`,
      matchedTerm: "挖土",
      group: "测试群(群 10001)",
      speaker: `群友${index}(QQ 20${index})`,
      message: `第${index}次说继续挖土`,
      contextBefore: [{ message: `第${index}次之前` }],
      contextAfter: [{ message: `第${index}次之后` }]
    }))
  };
}

test("interest-model deletion triage receives bounded evidence instead of the full long task", () => {
  const payload = buildQqKnowledgeInterestTriagePayload(application(), { sampleLimit: 4 });
  assert.equal(payload.retainedOccurrenceCount, 10);
  assert.equal(payload.occurrenceSample.length, 4);
  assert.deepEqual(payload.occurrenceSample.map((item) => item.message), [
    "第0次说继续挖土",
    "第1次说继续挖土",
    "第8次说继续挖土",
    "第9次说继续挖土"
  ]);
  assert.equal(payload.occurrenceSample[0].before.length, 1);
  assert.equal(payload.occurrenceSample[0].after.length, 1);
  assert.deepEqual(
    buildQqKnowledgeInterestTriagePayload(application(), { sampleLimit: 1 }).occurrenceSample.map((item) => item.message),
    ["第0次说继续挖土"]
  );
});

test("main deletion reviewer gets full evidence and treats interest output as advisory", () => {
  const source = application();
  const prompt = formatQqKnowledgeMainDeletionReviewPrompt({
    application: source,
    interestTriage: {
      recommendDelete: true,
      complexity: "complex",
      evidenceConcerns: ["可能只是暂时沉寂"],
      reason: "初筛建议删除"
    }
  });
  assert.match(prompt, /最终决策模型/);
  assert.match(prompt, /兴趣模型.*仅供参考/);
  assert.match(prompt, /完整证据为准/);
  assert.match(prompt, /不确定时保留/);
  assert.match(prompt, /第9次说继续挖土/);
  assert.match(prompt, /FINAL_JSON/);
});

test("main deletion evidence compresses only adjacent repeated surrounding messages", () => {
  const source = application();
  source.retainedOccurrences[0].contextBefore = [
    { at: "2026-01-01T00:00:01.000Z", speaker: "甲", message: "继续" },
    { at: "2026-01-01T00:00:02.000Z", speaker: "乙", message: "继续" },
    { at: "2026-01-01T00:00:03.000Z", speaker: "丙", message: "继续" },
    { at: "2026-01-01T00:00:04.000Z", speaker: "甲", message: "别的内容" },
    { at: "2026-01-01T00:00:05.000Z", speaker: "乙", message: "继续" }
  ];
  const prompt = formatQqKnowledgeMainDeletionReviewPrompt({ application: source });
  const payload = JSON.parse(prompt.split("\n").at(-1));
  const before = payload.fullDeletionApplication.retainedOccurrences[0].contextBefore;
  assert.deepEqual(before.map((item) => item.message), [
    "继续（连续重复 3 条）",
    "别的内容",
    "继续"
  ]);
  assert.equal(source.retainedOccurrences[0].contextBefore.length, 5);
});

test("main deletion-review parser accepts only a strict final decision", () => {
  assert.deepEqual(parseQqKnowledgeMainDeletionReview(
    '分析省略\nFINAL_JSON: {"delete":false,"reason":"虽然低频，但含义稳定且多个时期都有复用证据"}'
  ), {
    delete: false,
    reason: "虽然低频，但含义稳定且多个时期都有复用证据"
  });
  assert.equal(parseQqKnowledgeMainDeletionReview('{"delete":"no","reason":"错误类型"}'), null);
  assert.equal(parseQqKnowledgeMainDeletionReview('{"delete":true}'), null);
});

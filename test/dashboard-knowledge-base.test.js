import assert from "node:assert/strict";
import test from "node:test";
import {
  applyDashboardKnowledgeMutation,
  DashboardKnowledgeConflictError
} from "../src/dashboard-knowledge-base.js";
import { createEmptyQqKnowledgeBase } from "../src/qq-knowledge-base.js";

function add(store, overrides = {}) {
  return applyDashboardKnowledgeMutation(store, {
    action: "upsert",
    kind: "slang",
    title: "开香槟",
    content: "事情还没结束就提前庆祝",
    aliases: ["香槟"],
    scopeType: "group",
    groupId: "12345678",
    groupName: "测试群",
    ...overrides
  }, { at: "2026-07-21T02:00:00.000Z" });
}

test("dashboard knowledge upserts scoped entries and updates the exact variant", () => {
  const created = add(createEmptyQqKnowledgeBase());
  assert.equal(created.action, "added");
  assert.equal(created.entry.kind, "slang");
  assert.equal(created.variant.scope.groupId, "12345678");
  assert.equal(created.store.groups["12345678"].name, "测试群");

  created.variant.usage.hitCount = 7;
  const updated = add(created.store, {
    entryId: created.entry.id,
    variantId: created.variant.id,
    title: "开香槟了",
    content: "在结果确定前提前庆祝，通常用于提醒别立旗"
  });
  assert.equal(updated.action, "updated");
  assert.equal(updated.entry.id, created.entry.id);
  assert.equal(updated.variant.id, created.variant.id);
  assert.equal(updated.variant.usage.hitCount, 7, "manual edits must preserve slang frequency");
  assert.ok(updated.entry.aliases.includes("开香槟"), "renaming should preserve the old title as an alias");
});

test("dashboard knowledge deletes only the selected same-title scope", () => {
  const groupA = add(createEmptyQqKnowledgeBase());
  const groupB = add(groupA.store, {
    groupId: "87654321",
    groupName: "另一个群",
    content: "这个群里表示准备开庆功宴"
  });
  assert.equal(groupB.entry.variants.length, 2);

  const removed = applyDashboardKnowledgeMutation(groupB.store, {
    action: "delete",
    entryId: groupA.entry.id,
    variantId: groupA.variant.id
  }, { at: "2026-07-21T03:00:00.000Z" });
  assert.equal(removed.action, "deleted");
  assert.equal(removed.store.entries[0].variants.length, 1);
  assert.equal(removed.store.entries[0].variants[0].scope.groupId, "87654321");
});

test("dashboard knowledge rejects stale IDs, scope moves, and unsafe renames", () => {
  const first = add(createEmptyQqKnowledgeBase());
  assert.throws(() => applyDashboardKnowledgeMutation(first.store, {
    action: "delete",
    entryId: first.entry.id,
    variantId: "missing"
  }), DashboardKnowledgeConflictError);

  assert.throws(() => add(first.store, {
    entryId: first.entry.id,
    variantId: first.variant.id,
    groupId: "87654321"
  }), /cannot change scope/);

  const second = add(first.store, {
    title: "另一条",
    content: "另一条解释",
    groupId: "87654321"
  });
  assert.throws(() => add(second.store, {
    entryId: first.entry.id,
    variantId: first.variant.id,
    title: "另一条"
  }), DashboardKnowledgeConflictError);
});

test("dashboard knowledge validates QQ identifiers and required fields", () => {
  assert.throws(() => add(createEmptyQqKnowledgeBase(), { groupId: "abc" }), /groupId/);
  assert.throws(() => add(createEmptyQqKnowledgeBase(), { content: "" }), /content is required/);
  const global = applyDashboardKnowledgeMutation(createEmptyQqKnowledgeBase(), {
    action: "upsert",
    kind: "note",
    title: "全局知识",
    content: "可以不包含 QQ 范围",
    scopeType: "global"
  });
  assert.equal(global.variant.scope.type, "global");
});

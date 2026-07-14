import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createQqRequestStore, formatQqRequestEntry, normalizeOneBotRequest } from "../src/qq-request-store.js";

test("normalizeOneBotRequest normalizes friend and group requests", () => {
  const friend = normalizeOneBotRequest({
    post_type: "request",
    request_type: "friend",
    flag: "friend-flag",
    user_id: 123456,
    comment: "hi"
  }, { now: () => new Date("2026-07-13T08:00:00.000Z") });
  assert.equal(friend.requestType, "friend");
  assert.equal(friend.subType, "add");
  assert.equal(friend.userId, "123456");
  assert.equal(friend.status, "pending");
  assert.equal(friend.receivedAt, "2026-07-13T08:00:00.000Z");

  const invite = normalizeOneBotRequest({
    post_type: "request",
    request_type: "group",
    sub_type: "invite",
    flag: "group-flag",
    user_id: 654321,
    group_id: 10001
  });
  assert.equal(invite.requestType, "group");
  assert.equal(invite.subType, "invite");
  assert.equal(invite.groupId, "10001");

  const bounded = normalizeOneBotRequest({
    post_type: "request",
    request_type: "friend",
    flag: "x".repeat(20_000),
    user_id: "1234567890123456789012345",
    comment: "y".repeat(10_000)
  });
  assert.equal(bounded.flag.length, 512);
  assert.equal(bounded.comment.length, 500);
  assert.equal(bounded.userId, "");
});

test("QQ request store persists, deduplicates and updates requests", async () => {
  const dir = await mkdtemp(join(tmpdir(), "qq-request-store-"));
  const filePath = join(dir, "requests.json");
  const store = createQqRequestStore({ filePath });
  await store.load();
  const payload = {
    post_type: "request",
    request_type: "group",
    sub_type: "add",
    flag: "same-flag",
    user_id: 123456,
    group_id: 998877,
    comment: "申请加入"
  };
  const first = await store.record(payload);
  const duplicate = await store.record({ ...payload, comment: "更新后的留言" });
  assert.equal(first.isNew, true);
  assert.equal(duplicate.isNew, false);
  assert.equal(store.list().length, 1);
  assert.match(formatQqRequestEntry(duplicate.entry), /入群申请/);
  assert.match(formatQqRequestEntry(duplicate.entry), /更新后的留言/);

  const updated = await store.update(first.entry.id, {
    status: "approved",
    handledBy: "owner",
    handledAt: "2026-07-13T08:01:00.000Z"
  });
  assert.equal(updated.status, "approved");
  assert.equal(store.list().length, 0);
  assert.equal(store.list({ status: "all" }).length, 1);

  const reloaded = createQqRequestStore({ filePath });
  await reloaded.load();
  assert.equal(reloaded.find(first.entry.id).status, "approved");
  const body = JSON.parse(await readFile(filePath, "utf8"));
  assert.equal(body.version, 1);
});

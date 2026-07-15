import assert from "node:assert/strict";
import test from "node:test";
import {
  createOneBotEventDeduplicator,
  getEventDedupeKey,
  isOneBotPokeNotice,
  isOneBotPokeToSelf,
  normalizeOneBotEvent,
  normalizeOneBotPokeEvent,
  normalizeQqIdentifier,
  stripUntrustedQqLocalImagePaths
} from "../src/channels/qq/onebot-event.js";

test("normalizes OneBot message structure at the QQ channel boundary", () => {
  const payload = {
    post_type: "message",
    message_type: "group",
    self_id: 123456,
    group_id: 234567,
    user_id: 345678,
    sender: { card: "测试群友" },
    raw_message: "hello",
    message: [
      { type: "at", data: { qq: "123456" } },
      { type: "text", data: { text: "hello" } },
      { type: "reply", data: { id: 42 } },
      { type: "forward", data: { id: "forward-1" } }
    ]
  };
  const event = normalizeOneBotEvent(payload, {
    extractImageInputs: () => [{ url: "https://example.com/image.png" }]
  });

  assert.equal(event.type, "group_at");
  assert.equal(event.selfId, "123456");
  assert.equal(event.groupId, "234567");
  assert.equal(event.senderId, "345678");
  assert.equal(event.senderName, "测试群友");
  assert.equal(event.replyMessageId, "42");
  assert.deepEqual(event.atTargets, ["123456"]);
  assert.deepEqual(event.contentContext.forwardIds, ["forward-1"]);
  assert.equal(event.images.length, 1);
});

test("normalizes poke notices and validates QQ identifiers", () => {
  const payload = {
    post_type: "notice",
    notice_type: "notify",
    sub_type: "poke",
    self_id: 123456,
    target_id: 123456,
    sender_id: 234567,
    group_id: 345678
  };

  assert.equal(isOneBotPokeNotice(payload), true);
  assert.equal(isOneBotPokeToSelf(payload), true);
  assert.equal(normalizeOneBotPokeEvent(payload).type, "group_poke");
  assert.equal(normalizeQqIdentifier("123"), undefined);
  assert.equal(normalizeQqIdentifier(" 123456 "), "123456");
});

test("removes untrusted local image paths without changing remote images", () => {
  const event = stripUntrustedQqLocalImagePaths({
    images: [
      { file: "/tmp/private.png", path: "/tmp/private.png" },
      { file: "remote-name.png", url: "https://example.com/remote.png" }
    ]
  });

  assert.equal(event.images[0].file, "");
  assert.equal(event.images[0].path, "");
  assert.equal(event.images[1].file, "remote-name.png");
});

test("deduplicates bounded OneBot event keys and expires stale entries", () => {
  let currentTime = 100;
  const deduplicator = createOneBotEventDeduplicator({
    ttlMs: 10,
    maxEntries: 2,
    now: () => currentTime
  });
  const event = { raw: { message_id: 42 } };
  const key = getEventDedupeKey(event);

  assert.equal(key, "message_id:42");
  assert.equal(deduplicator.remember(key), false);
  assert.equal(deduplicator.remember(key), true);
  currentTime = 111;
  assert.equal(deduplicator.remember("message_id:43"), false);
  assert.equal(deduplicator.remember(key), false);
  assert.ok(deduplicator.size <= 2);
});

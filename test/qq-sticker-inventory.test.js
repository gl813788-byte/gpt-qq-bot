import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createQqStickerInventory } from "../src/qq-sticker-inventory.js";

test("persists downloaded marketplace stickers with stable unique names", async () => {
  const dir = await mkdtemp(join(tmpdir(), "qq-sticker-inventory-"));
  const filePath = join(dir, "inventory.json");
  let tick = 0;
  const inventory = createQqStickerInventory({
    filePath,
    now: () => new Date(`2026-01-01T00:00:0${tick++}.000Z`)
  });

  await inventory.remember([
    { emojiId: "abcdef111111", packageId: "7", tags: ["开心"], name: "开心", key: "one" },
    { emojiId: "abcdef222222", packageId: "7", tags: ["开心"], name: "开心", key: "two" }
  ]);
  await inventory.remember([
    { emojiId: "abcdef111111", packageId: "7", tags: ["开心"], name: "开心", key: "new-key" }
  ]);

  const reloaded = createQqStickerInventory({ filePath });
  const list = await reloaded.list();
  assert.equal(list.length, 2);
  assert.notEqual(list[0].name, list[1].name);
  assert.ok(list.every((item) => item.source === "downloaded" && item.animated));
  assert.equal(list.find((item) => item.emojiId === "abcdef111111").key, "new-key");
  assert.match(list[0].url, /raw300\.gif$/);
});

test("does not inventory ordinary custom images while merely observing messages", async () => {
  const dir = await mkdtemp(join(tmpdir(), "qq-sticker-inventory-"));
  const inventory = createQqStickerInventory({ filePath: join(dir, "inventory.json") });
  await inventory.remember([{ name: "普通图片", source: "received", file: "photo.jpg" }]);
  assert.deepEqual(await inventory.list(), []);
});

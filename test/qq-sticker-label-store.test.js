import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createQqStickerLabelStore } from "../src/qq-sticker-label-store.js";

test("requires a first view before labeling and supports repeat views with label updates", async () => {
  const dir = await mkdtemp(join(tmpdir(), "qq-sticker-labels-"));
  const filePath = join(dir, "labels.json");
  let tick = 0;
  const store = createQqStickerLabelStore({
    filePath,
    now: () => new Date(Date.UTC(2026, 0, 1, 0, 0, tick++))
  });
  const sticker = { name: "账号表情1", source: "account", id: "stable-face-id", url: "https://example.test/face" };

  const rejected = await store.updateLabels(sticker, { tags: ["开心"] });
  assert.equal(rejected.ok, false);

  const firstView = await store.markViewed(sticker);
  assert.equal(firstView.viewCount, 1);
  const firstLabel = await store.updateLabels(sticker, {
    tags: ["开心", " 开心 ", "赞同"],
    description: "笑着点头"
  });
  assert.equal(firstLabel.ok, true);
  assert.deepEqual(firstLabel.entry.tags, ["开心", "赞同"]);

  const secondView = await store.markViewed(sticker);
  assert.equal(secondView.viewCount, 2);
  const updated = await store.updateLabels(sticker, {
    tags: "无语,吐槽",
    description: "重新查看后认为是无语摊手"
  });
  assert.deepEqual(updated.entry.tags, ["无语", "吐槽"]);

  const [enriched] = await store.enrich([sticker]);
  assert.equal(enriched.viewCount, 2);
  assert.deepEqual(enriched.tags, ["无语", "吐槽"]);
  assert.equal(enriched.description, "重新查看后认为是无语摊手");

  const persisted = JSON.parse(await readFile(filePath, "utf8"));
  assert.equal(Object.keys(persisted.stickers).length, 1);
});

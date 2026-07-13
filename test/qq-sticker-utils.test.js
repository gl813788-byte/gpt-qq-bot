import test from "node:test";
import assert from "node:assert/strict";
import {
  extractQqReplyStickerCandidates,
  normalizeQqAccountStickerCatalog
} from "../src/qq-sticker-utils.js";

test("reads QQ-native labels and animation flags from account sticker details", () => {
  const catalog = normalizeQqAccountStickerCatalog({
    emojiInfoList: [{
      emoId: 42,
      resId: "resource-42",
      md5: "ABCDEF",
      url: "https://example.test/favorite.apng",
      isAPNG: true,
      desc: "开心、赞同",
      ocrWord: "好耶"
    }]
  });

  assert.equal(catalog.length, 1);
  assert.equal(catalog[0].name, "账号表情1-开心");
  assert.deepEqual(catalog[0].tags, ["开心", "赞同", "好耶"]);
  assert.equal(catalog[0].animated, true);
  assert.equal(catalog[0].md5, "abcdef");
});

test("extracts tagged marketplace stickers only from the replied message context", () => {
  const image = {
    file: "ab-market.gif",
    url: "https://example.test/raw300.gif",
    summary: "[猫猫震惊]",
    raw: {
      emoji_id: "abcdef123456",
      emoji_package_id: 77,
      key: "market-key",
      summary: "[猫猫震惊]"
    }
  };
  const candidates = extractQqReplyStickerCandidates({ images: [image] });

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].name, "猫猫震惊");
  assert.deepEqual(candidates[0].tags, ["猫猫震惊"]);
  assert.equal(candidates[0].animated, true);
  assert.equal(candidates[0].emojiId, "abcdef123456");
  assert.equal(candidates[0].packageId, "77");
});

test("does not treat an ordinary photo as a sticker candidate", () => {
  const candidates = extractQqReplyStickerCandidates({
    images: [{ file: "photo.jpg", url: "https://example.test/photo.jpg", summary: "" }]
  });
  assert.deepEqual(candidates, []);
});

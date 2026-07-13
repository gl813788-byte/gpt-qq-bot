import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prepareQqModelImages } from "../src/qq-enhancer/index.js";

const onePixelPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

test("falls back to a sticker URL when OneBot cannot resolve its display filename", async () => {
  const outputDir = await mkdtemp(join(tmpdir(), "qq-sticker-image-"));
  let fetchAttempts = 0;

  const paths = await prepareQqModelImages([
    {
      file: "account-sticker-1.jpg",
      url: onePixelPng
    }
  ], {
    outputDir,
    fetchOneBotImage: async () => {
      fetchAttempts += 1;
      throw new Error("OneBot get_image could not find the synthetic filename");
    }
  });

  assert.equal(fetchAttempts, 1);
  assert.equal(paths.length, 1);
  const image = await readFile(paths[0]);
  assert.equal(image.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
});

import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { resolveAllowedQqMarkerPath } from "../src/qq-output-policy.js";

test("only permits QQ markers from the current task output and approved image roots", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "codex-qq-media-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const outputDir = join(root, "workspaces", "current", "output");
  const inputDir = join(root, "workspaces", "current", "input");
  const oldOutputDir = join(root, "workspaces", "old", "output");
  const legacyImageDir = join(root, "legacy-images");
  const stickerDir = join(root, "stickers");
  const privateDir = join(root, "private");
  await Promise.all([outputDir, inputDir, oldOutputDir, legacyImageDir, stickerDir, privateDir].map((path) => mkdir(path, { recursive: true })));

  const generatedImage = join(outputDir, "generated.png");
  const generatedFile = join(outputDir, "report.pdf");
  const legacyImage = join(legacyImageDir, "legacy.webp");
  const sticker = join(stickerDir, "sticker.gif");
  const privateFile = join(privateDir, "settings.json");
  const inputImage = join(inputDir, "input.png");
  const oldImage = join(oldOutputDir, "old.png");
  await Promise.all([
    writeFile(generatedImage, "image"),
    writeFile(generatedFile, "report"),
    writeFile(legacyImage, "image"),
    writeFile(sticker, "image"),
    writeFile(privateFile, "secret"),
    writeFile(inputImage, "image"),
    writeFile(oldImage, "image")
  ]);
  await symlink(privateFile, join(outputDir, "escape.png"));

  const options = {
    projectDir: root,
    event: { qqTaskWorkspace: { outputDir } },
    qqOutputImagesDir: legacyImageDir,
    qqStickerDir: stickerDir
  };

  assert.equal(await resolveAllowedQqMarkerPath(generatedImage, { ...options, kind: "image" }), generatedImage);
  assert.equal(await resolveAllowedQqMarkerPath(generatedFile, { ...options, kind: "file" }), generatedFile);
  assert.equal(await resolveAllowedQqMarkerPath(pathToFileURL(generatedImage).href, { ...options, kind: "image" }), generatedImage);
  assert.equal(await resolveAllowedQqMarkerPath(legacyImage, { ...options, kind: "image" }), legacyImage);
  assert.equal(await resolveAllowedQqMarkerPath(sticker, { ...options, kind: "image" }), sticker);

  assert.equal(await resolveAllowedQqMarkerPath(legacyImage, { ...options, kind: "file" }), "");
  assert.equal(await resolveAllowedQqMarkerPath(privateFile, { ...options, kind: "file" }), "");
  assert.equal(await resolveAllowedQqMarkerPath(inputImage, { ...options, kind: "image" }), "");
  assert.equal(await resolveAllowedQqMarkerPath(oldImage, { ...options, kind: "image" }), "");
  assert.equal(await resolveAllowedQqMarkerPath(join(outputDir, "escape.png"), { ...options, kind: "image" }), "");
});

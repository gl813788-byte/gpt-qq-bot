import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  chooseMiddleFrameIndexes,
  inspectAnimatedSticker,
  parseFrameSelection
} from "../src/qq-animated-sticker.js";

test("uses the middle three frames as the default animation inspection", async () => {
  const outputDir = await mkdtemp(join(tmpdir(), "qq-animated-sticker-"));
  const commands = [];
  const run = async (command, args) => {
    commands.push({ command, args });
    if (String(command).includes("ffprobe")) {
      return { stdout: JSON.stringify({ streams: [{ nb_read_frames: "9", duration: "0.9" }] }) };
    }
    const pattern = args.at(-1);
    for (let index = 1; index <= 3; index += 1) {
      await writeFile(pattern.replace("%02d", String(index).padStart(2, "0")), "frame");
    }
    return { stdout: "" };
  };

  const result = await inspectAnimatedSticker("/tmp/source.gif", { outputDir, run });

  assert.equal(result.selection, "中段3帧");
  assert.deepEqual(result.indexes, [3, 4, 5]);
  assert.equal(result.frames.length, 3);
  assert.match(commands[1].args.join(" "), /eq\(n\\,3\).*eq\(n\\,4\).*eq\(n\\,5\)/);
});

test("accepts model-selected frame counts and positions with a safety cap", () => {
  assert.deepEqual(chooseMiddleFrameIndexes(10, 3), [3, 4, 5]);
  assert.deepEqual(parseFrameSelection("20%,50%,80%", 11), [2, 5, 8]);
  assert.deepEqual(parseFrameSelection("第1帧,第10帧", 10), [0, 9]);
  assert.deepEqual(parseFrameSelection("均匀5帧", 9), [0, 2, 4, 6, 8]);
  assert.equal(parseFrameSelection("均匀20帧", 30, { maxFrames: 8 }).length, 8);
});

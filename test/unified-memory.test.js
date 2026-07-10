import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createUnifiedMemory } from "../src/unified-memory/index.js";

test("serializes concurrent unified-memory writes without losing entries", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "codex-qq-memory-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const memoryPath = join(directory, "unified-memory.json");
  const memory = createUnifiedMemory({ memoryPath });

  await Promise.all(Array.from({ length: 10 }, (_, index) => memory.write({
    type: "projectNote",
    source: "test",
    topic: `topic-${index}`,
    summary: `summary-${index}`
  })));

  const snapshot = await memory.read({ limit: 20 });
  assert.equal(snapshot.entries.length, 10);
  assert.deepEqual(
    new Set(snapshot.entries.map((entry) => entry.summary)),
    new Set(Array.from({ length: 10 }, (_, index) => `summary-${index}`))
  );

  const stored = JSON.parse(await readFile(memoryPath, "utf8"));
  assert.equal(stored.entries.length, 10);
});

test("refuses to overwrite malformed unified-memory data", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "codex-qq-memory-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const memoryPath = join(directory, "unified-memory.json");
  await writeFile(memoryPath, "{not-json", "utf8");
  const memory = createUnifiedMemory({ memoryPath });

  await assert.rejects(
    memory.write({ summary: "should not replace corrupted data" }),
    /Unable to read unified memory/
  );
  assert.equal(await readFile(memoryPath, "utf8"), "{not-json");
});

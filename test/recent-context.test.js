import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { searchRecentCodexContext } from "../src/unified-memory/recent-context.js";

test("selects the newest JSONL files even when directory order reaches the old cap first", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "codex-qq-recent-context-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const sessionsDir = join(root, "sessions");
  const archivedSessionsDir = join(root, "archived");
  await mkdir(sessionsDir, { recursive: true });
  await mkdir(archivedSessionsDir, { recursive: true });

  const names = ["a", "b", "c", "znew"];
  for (const [index, name] of names.entries()) {
    const filePath = join(sessionsDir, `${name}.jsonl`);
    await writeFile(filePath, `${JSON.stringify({
      timestamp: `2026-01-01T00:00:0${index}Z`,
      role: "assistant",
      text: name
    })}\n`, "utf8");
    const time = new Date(`2026-01-01T00:00:0${index}Z`);
    await utimes(filePath, time, time);
  }

  const snippets = await searchRecentCodexContext({
    mode: "latest",
    limit: 5,
    maxFiles: 1,
    sessionsDir,
    archivedSessionsDir
  });

  assert.equal(snippets.length, 1);
  assert.equal(snippets[0].text, "znew");
});

import assert from "node:assert/strict";
import { mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import test from "node:test";

const projectDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const commandPath = join(projectDir, "scripts", "ncc.command");

test("repository ncc resolves its project when invoked outside the checkout or through a symlink", async () => {
  const directory = await mkdtemp(join(tmpdir(), "codex-remote-contact-ncc-"));
  const symlinkPath = join(directory, "ncc");
  const env = { ...process.env };
  delete env.GPT_QQ_BOT_HOME;

  try {
    await symlink(commandPath, symlinkPath);
    for (const entry of [commandPath, symlinkPath]) {
      const output = execFileSync("zsh", [entry, "help"], {
        cwd: tmpdir(),
        encoding: "utf8",
        env
      });
      assert.match(output, new RegExp(`项目目录：${escapeRegExp(projectDir)}(?:\\n|$)`));
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

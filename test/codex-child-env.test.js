import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildCodexChildEnv, parseEnvFile } from "../src/codex-child-env.js";

test("parses the supported active profile env syntax without executing shell code", () => {
  assert.deepEqual(parseEnvFile(`
    # profile
    export CODEX_API_KEY='secret-value'
    OPENAI_BASE_URL="https://example.test/v1"
    PLAIN=value # comment
  `), {
    CODEX_API_KEY: "secret-value",
    OPENAI_BASE_URL: "https://example.test/v1",
    PLAIN: "value"
  });
});

test("follows the main Codex login config for every child without retaining stale auth", async () => {
  const dir = await mkdtemp(join(tmpdir(), "codex-child-env-"));
  const profileEnvPath = join(dir, "active.env");
  const configPath = join(dir, "config.toml");
  const baseEnv = { HOME: "/root", OPENAI_API_KEY: "stale", KEEP: "yes" };

  await writeFile(profileEnvPath, "export CODEX_API_KEY='stale-profile'\nSEARCH_SETTING='kept'\n", "utf8");
  await writeFile(join(dir, "sharedchat.toml"), `
    model_provider = "codex"
    [model_providers.codex]
    base_url = "https://shared.example/codex"
    env_key = "CODEX_API_KEY"
  `, "utf8");
  await writeFile(join(dir, "sharedchat.env"), "export CODEX_API_KEY='shared-key'\n", "utf8");
  await writeFile(join(dir, "other.toml"), `
    model_provider = "OpenAI"
    [model_providers.OpenAI]
    base_url = "https://other.example/v1"
  `, "utf8");
  await writeFile(join(dir, "other.env"), "export OPENAI_API_KEY='other-key'\nexport OPENAI_BASE_URL='https://other.example/v1'\n", "utf8");

  await writeFile(configPath, `
    model_provider = "codex"
    [model_providers.codex]
    base_url = "https://shared.example/codex/"
    env_key = "CODEX_API_KEY"
  `, "utf8");
  const first = buildCodexChildEnv({ baseEnv, profileEnvPath, configPath });
  assert.equal(first.CODEX_API_KEY, "shared-key");
  assert.equal(first.OPENAI_API_KEY, undefined);
  assert.equal(first.SEARCH_SETTING, "kept");
  assert.equal(first.HOME, "/root");

  await writeFile(configPath, "model = 'gpt-official'\n", "utf8");
  const second = buildCodexChildEnv({ baseEnv, profileEnvPath, configPath, overrides: { REQUEST_MODE: "qq" } });
  assert.equal(second.CODEX_API_KEY, undefined);
  assert.equal(second.OPENAI_API_KEY, undefined);
  assert.equal(second.REQUEST_MODE, "qq");
  assert.equal(second.KEEP, "yes");

  await writeFile(configPath, `
    model_provider = "OpenAI"
    [model_providers.OpenAI]
    base_url = "https://other.example/v1"
  `, "utf8");
  const third = buildCodexChildEnv({ baseEnv, profileEnvPath, configPath });
  assert.equal(third.CODEX_API_KEY, undefined);
  assert.equal(third.OPENAI_API_KEY, "other-key");
  assert.equal(third.OPENAI_BASE_URL, "https://other.example/v1");
});

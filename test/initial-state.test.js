import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState } from "../src/app/create-initial-state.js";
import { createEnvironmentConfig } from "../src/config/environment.js";

test("creates isolated application state from normalized configuration", () => {
  const config = createEnvironmentConfig({
    CODEX_REMOTE_CONTACT_QQ_ENHANCER: "0",
    CODEX_REMOTE_CONTACT_QQ_MEMORY_LIMIT: "25"
  });
  const first = createInitialState({
    config,
    codexWorkspaceDir: "/tmp/workspace",
    qqProactiveInterestPreset: { name: "test" },
    startedAt: "2026-01-01T00:00:00.000Z"
  });
  const second = createInitialState({
    config,
    codexWorkspaceDir: "/tmp/workspace",
    qqProactiveInterestPreset: { name: "test" }
  });

  assert.equal(first.ai.workspace, "/tmp/workspace");
  assert.equal(first.qq.enhancer.enabled, false);
  assert.equal(first.qq.proactive.enabled, false);
  assert.equal(first.qq.memory.perGroupLimit, 25);
  assert.equal(first.qq.proactive.judge.provider, "openrouter");
  assert.equal(first.qq.proactive.judge.model, "openrouter/free");
  assert.equal(first.qq.codexSession.settings.defaultMode, "auto");
  assert.equal(Object.getPrototypeOf(first.qq.codexSession.settings.scopes), null);
  assert.equal(Object.getPrototypeOf(first.qq.codexSession.store.threads), null);
  assert.equal(Object.getPrototypeOf(first.qq.memory.shortTermNotes), null);
  assert.equal(first.qq.knowledgeBase.version, 1);
  assert.deepEqual(first.qq.knowledgeBase.entries, []);
  assert.deepEqual(first.channels, { qq: false });
  assert.deepEqual(first.network, { allowLanAccess: false, publicTunnelEnabled: false });
  assert.equal("imessage" in first, false);
  assert.equal("remoteExecution" in first, false);
  assert.equal("proxy" in first, false);
  assert.equal(first.maintenance.startedAt, "2026-01-01T00:00:00.000Z");

  first.qq.allowedGroups.push("123456");
  first.qq.memory.entries.group = ["message"];
  first.qq.knowledgeBase.entries.push({ title: "测试" });
  assert.deepEqual(second.qq.allowedGroups, []);
  assert.equal(second.qq.memory.entries.group, undefined);
  assert.deepEqual(second.qq.knowledgeBase.entries, []);
  assert.equal(Object.getPrototypeOf(first.qq.memory.entries), null);
});

import assert from "node:assert/strict";
import test from "node:test";
import { applyDashboardBotSettings, readDashboardBotSettings } from "../src/dashboard-bot-settings.js";

function createState() {
  return {
    qq: {
      enhancer: { enabled: true },
      webLookup: { enabled: true },
      proactive: {
        enabled: true,
        judgeEveryMessages: 20,
        judgeEveryMinutes: 5,
        judge: {
          enabled: true,
          provider: "openrouter",
          model: "provider/model:free",
          timeoutMs: 6500,
          maxRecentMessages: 8,
          apiKeyConfigured: true
        }
      }
    }
  };
}

test("dashboard Bot settings update bounded runtime controls and can roll back", () => {
  const state = createState();
  const change = applyDashboardBotSettings(state, {
    webLookupEnabled: false,
    proactiveEnabled: true,
    judgeEveryMessages: 12,
    judgeEveryMinutes: 3,
    judgeModel: "vendor/new-model:free",
    judgeTimeoutMs: 9000,
    judgeMaxRecentMessages: 10
  });

  assert.deepEqual(change.settings, {
    enhancerEnabled: true,
    webLookupEnabled: false,
    proactiveEnabled: true,
    judgeEnabled: true,
    judgeEveryMessages: 12,
    judgeEveryMinutes: 3,
    judgeModel: "vendor/new-model:free",
    judgeTimeoutMs: 9000,
    judgeMaxRecentMessages: 10,
    judgeProvider: "openrouter",
    judgeApiKeyConfigured: true
  });

  change.restore();
  assert.equal(readDashboardBotSettings(state).judgeEveryMessages, 20);
  assert.equal(readDashboardBotSettings(state).webLookupEnabled, true);
});

test("dashboard Bot settings preserve enhancer and proactive invariants", () => {
  const disabled = createState();
  applyDashboardBotSettings(disabled, { enhancerEnabled: false, proactiveEnabled: true });
  assert.equal(disabled.qq.enhancer.enabled, true, "enabling proactive also enables the enhancer");
  assert.equal(disabled.qq.proactive.enabled, true);

  const enhancerOff = createState();
  applyDashboardBotSettings(enhancerOff, { enhancerEnabled: false });
  assert.equal(enhancerOff.qq.proactive.enabled, false);
});

test("dashboard Bot settings reject malformed values without mutation", () => {
  const state = createState();
  assert.throws(() => applyDashboardBotSettings(state, { judgeTimeoutMs: 500 }), /between 1500 and 20000/);
  assert.throws(() => applyDashboardBotSettings(state, { judgeModel: "bad model id" }), /valid provider model id/);
  assert.equal(readDashboardBotSettings(state).judgeTimeoutMs, 6500);
});

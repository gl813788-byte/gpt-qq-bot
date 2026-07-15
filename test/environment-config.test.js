import assert from "node:assert/strict";
import test from "node:test";
import { createEnvironmentConfig } from "../src/config/environment.js";

test("builds one normalized configuration object from environment values", () => {
  const config = createEnvironmentConfig({
    CODEX_REMOTE_CONTACT_PORT: "4500",
    CODEX_REMOTE_CONTACT_CORS_ORIGINS: "http://dashboard.local, http://dashboard.local",
    CODEX_REMOTE_CONTACT_ONEBOT_MAX_CONCURRENCY: "99",
    CODEX_REMOTE_CONTACT_CODEX_MAX_PENDING: "-5",
    CODEX_REMOTE_CONTACT_QQ_BUBBLE_SEPARATOR: "  ---  ",
    CODEX_REMOTE_CONTACT_QQ_WEB_TIMEOUT_MS: "10000",
    CODEX_REMOTE_CONTACT_SAFE_FETCH_MODE: "proxy",
    CODEX_REMOTE_CONTACT_IMESSAGE_ATTACHMENTS: "1"
  });

  assert.equal(config.hubPort, 4500);
  assert.deepEqual(config.hubAllowedOrigins, ["http://dashboard.local"]);
  assert.equal(config.oneBotMaxConcurrency, 32);
  assert.equal(config.codexMaxPending, 0);
  assert.equal(config.qqBubbleSeparator, "---");
  assert.equal(config.qqWebLookupAttemptTimeoutMs, 5_500);
  assert.equal(config.safeFetchMode, "proxy-compatible");
  assert.equal(config.imessageImageDelivery, "attachment");
});

test("uses stable defaults and rejects invalid listener ports", () => {
  const defaults = createEnvironmentConfig({});
  const invalidPort = createEnvironmentConfig({ CODEX_REMOTE_CONTACT_PORT: "12.5" });

  assert.equal(defaults.hubPort, 3789);
  assert.equal(defaults.codexMaxConcurrency, 2);
  assert.equal(defaults.qqBubbleSeparator, "|||");
  assert.equal(defaults.qqProactiveJudgeMinInterest, 20);
  assert.equal(defaults.safeFetchMode, "strict");
  assert.equal(invalidPort.hubPort, 3789);
});

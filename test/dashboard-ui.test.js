import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const resources = new URL("../modules/mac-client/Resources/", import.meta.url);
const html = readFileSync(new URL("client.html", resources), "utf8");
const css = readFileSync(new URL("client.css", resources), "utf8");
const javascript = readFileSync(new URL("client.js", resources), "utf8");

function unique(values) {
  return [...new Set(values)];
}

function extractTranslations(source) {
  const prefix = "const translations = ";
  const suffix = "\n\nconst app =";
  const start = source.indexOf(prefix);
  const end = source.indexOf(suffix, start + prefix.length);
  assert.notEqual(start, -1, "client.js must declare translations");
  assert.notEqual(end, -1, "translations must be declared before app state");

  const expression = source.slice(start + prefix.length, end).replace(/;\s*$/, "");
  return vm.runInNewContext(`(${expression})`, Object.create(null), { timeout: 100 });
}

test("dashboard HTML has unique ids referenced by static client selectors", () => {
  const ids = [...html.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)].map((match) => match[1]);
  const duplicateIds = unique(ids.filter((id, index) => ids.indexOf(id) !== index));
  assert.deepEqual(duplicateIds, [], `duplicate HTML ids: ${duplicateIds.join(", ")}`);

  const knownIds = new Set(ids);
  const referencedIds = unique(
    [...javascript.matchAll(/\$\(\s*["']#([^"']+)["']\s*\)/g)].map((match) => match[1])
  );
  const missingIds = referencedIds.filter((id) => !knownIds.has(id));
  assert.deepEqual(missingIds, [], `client.js references missing HTML ids: ${missingIds.join(", ")}`);
});

test("dashboard translations stay aligned and cover static i18n usage", () => {
  const translations = extractTranslations(javascript);
  const zhKeys = Object.keys(translations.zh || {}).sort();
  const enKeys = Object.keys(translations.en || {}).sort();
  assert.ok(zhKeys.length > 0, "Chinese translations must not be empty");
  assert.deepEqual(enKeys, zhKeys, "Chinese and English translation keys must match");

  const scriptKeys = [...javascript.matchAll(/\bt\(\s*["']([^"']+)["']/g)].map((match) => match[1]);
  const markupKeys = [...html.matchAll(/\bdata-i18n(?:-[a-z-]+)?\s*=\s*["']([^"']+)["']/gi)]
    .map((match) => match[1]);
  const availableKeys = new Set(zhKeys);
  const missingKeys = unique([...scriptKeys, ...markupKeys]).filter((key) => !availableKeys.has(key));
  assert.deepEqual(missingKeys, [], `missing translations for static keys: ${missingKeys.join(", ")}`);
});

test("dashboard HTML keeps executable code and styles in external assets", () => {
  assert.doesNotMatch(html, /<style\b/i, "inline style blocks are not allowed");
  assert.doesNotMatch(html, /\sstyle\s*=/i, "inline style attributes are not allowed");

  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  assert.ok(scripts.length > 0, "dashboard must load its client script");
  for (const [, attributes, body] of scripts) {
    assert.match(attributes, /\bsrc\s*=\s*["'][^"']+["']/i, "scripts must use an external src");
    assert.equal(body.trim(), "", "inline script bodies are not allowed");
  }
});

test("dashboard CSS defines desktop-to-mobile responsive breakpoints", () => {
  const breakpoints = [...css.matchAll(/@media\s*\(\s*max-width\s*:\s*(\d+)px\s*\)/gi)]
    .map((match) => Number(match[1]));
  assert.ok(unique(breakpoints).length >= 2, "CSS must define multiple responsive breakpoints");
  assert.ok(breakpoints.some((value) => value <= 600), "CSS must include a compact mobile breakpoint");
  assert.ok(breakpoints.some((value) => value >= 800), "CSS must include a tablet/desktop breakpoint");
});

test("dashboard logs keep localized copy and distinct severity/category colors", () => {
  assert.match(javascript, /entry\.messageZh\s*\|\|\s*entry\.message/);
  assert.match(javascript, /entry\.errorZh/);
  for (const level of ["debug", "info", "success", "warn", "error"]) {
    assert.match(css, new RegExp(`\\.log-entry\\.level-${level}\\s*\\{`));
  }
  for (const category of ["system", "qq", "onebot", "codex", "search", "interest", "learning", "lifecycle"]) {
    assert.match(css, new RegExp(`\\.log-entry\\.category-${category}\\s*\\{`));
  }
  assert.match(css, /\.log-duration\.slow\s*\{/);
  assert.match(css, /\.log-duration\.bad\s*\{/);
});

test("dashboard keeps one QQ channel separate from Bot intelligence controls", () => {
  const channelsStart = html.indexOf('id="view-channels"');
  const intelligenceStart = html.indexOf('id="view-intelligence"');
  const memoryStart = html.indexOf('id="view-memory"');
  assert.ok(channelsStart >= 0 && intelligenceStart > channelsStart && memoryStart > intelligenceStart);

  const channelView = html.slice(channelsStart, intelligenceStart);
  const intelligenceView = html.slice(intelligenceStart, memoryStart);
  assert.match(channelView, /id="qqToggle"/);
  assert.match(channelView, /id="groupList"/);
  assert.doesNotMatch(channelView, /id="handleList"/);
  assert.doesNotMatch(channelView, /id="imessageToggle"/i);
  assert.doesNotMatch(channelView, /id="qqAdaptiveLearning"/);
  for (const id of ["qqSelfPersona", "qqStickerFrequency", "qqAdaptiveLearning", "qqColdInterest", "qqPrivateInterest", "botSettingsForm"]) {
    assert.match(intelligenceView, new RegExp(`id="${id}"`));
  }
  assert.match(intelligenceView, /class="behavior-column behavior-column-main"/);
  assert.match(intelligenceView, /class="behavior-column behavior-column-side"/);
  assert.match(javascript, /network\?\.safeFetchMode/);
  assert.match(javascript, /validViews = new Set\(\["overview", "channels", "intelligence", "memory", "activity", "settings"\]\)/);
  assert.match(javascript, /\/api\/qq\/bot-settings/);
});

test("dashboard live log view requests verbose entries and renders every detail inline", () => {
  for (const id of ["liveLogsToggle", "logFollowToggle", "logLimit", "liveLogState", "logLastUpdated", "logStream"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(javascript, /verbose:\s*"1"/);
  assert.match(javascript, /app\.view === "activity" && app\.liveLogs && now - app\.lastFetch\.logs >= 1_000/);
  assert.match(javascript, /function renderLogDetails\(entry\)/);
  assert.match(javascript, /Object\.entries\(entry\.details \|\| \{\}\)/);
  assert.match(css, /\.live-log-state\.active\s*\{/);
  assert.match(css, /\.log-detail-grid\s*\{/);
  assert.match(css, /\.log-detail\.is-error\s*\{/);
});

test("dashboard exposes local-only token-protected temporary public tunnel controls", () => {
  for (const id of ["publicTunnelToggle", "publicTunnelHint", "publicTunnelUrl", "copyPublicTunnelUrl", "copyPublicTunnelToken"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(javascript, /\/api\/network\/public-tunnel/);
  assert.match(javascript, /publicTunnelToggle"\)\.disabled = !app\.state \|\| !localBrowser/);
  assert.match(javascript, /copyPublicTunnelToken"\)\.disabled = !tunnelRunning \|\| !network\.apiTokenConfigured \|\| !localBrowser/);
  assert.match(javascript, /publicTunnelEnableMessage/);
  assert.match(css, /\.public-tunnel-card\s*\{/);
});

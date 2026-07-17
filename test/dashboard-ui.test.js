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

test("dashboard overview follows the editorial operations hierarchy with restrained motion", () => {
  const overviewStart = html.indexOf('id="view-overview"');
  const channelsStart = html.indexOf('id="view-channels"');
  const overview = html.slice(overviewStart, channelsStart);

  for (const className of ["overview-lead", "service-topology", "metric-ticker", "overview-operations-grid", "pulse-chart", "overview-lower-grid"]) {
    assert.match(overview, new RegExp(`class="[^"]*${className}`));
  }
  for (const id of ["heroCard", "heroTitle", "heroBody", "serviceTopology", "overviewBrief", "overviewStats", "healthGrid", "pulseLine", "pulsePoint", "quotaOverview", "recentTimeline", "quickChannels"]) {
    assert.match(overview, new RegExp(`id="${id}"`));
  }
  for (const service of ["QQ", "OneBot", "Codex", "Web", "HUB"]) assert.match(overview, new RegExp(`>${service}<`));
  assert.match(css, /@keyframes draw-pulse/);
  assert.match(css, /@keyframes editorial-enter/);
  assert.match(css, /@keyframes precision-pulse/);
  assert.match(css, /\.pulse-layout\s*\{\s*grid-template-columns:\s*1fr/);
  assert.match(css, /\.health-grid\s*\{\s*grid-template-columns:\s*repeat\(4/);
  assert.match(css, /\.pulse-chart svg\s*\{[^}]*width:\s*100%[^}]*height:\s*210px/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("dashboard realtime visuals are driven by API samples instead of fixed demo values", () => {
  assert.match(html, /id="pulseLine" class="pulse-line" d=""/);
  assert.doesNotMatch(html, /M0 103C34 96/);
  assert.match(javascript, /function recordRuntimeSample\(latencyMs\)/);
  assert.match(javascript, /performance\.now\(\) - requestStartedAt/);
  assert.match(javascript, /function renderRuntimePulse\(\)/);
  assert.match(javascript, /Math\.round\(\(samples\[0\]\.at \+ latest\.at\) \/ 2\)/);
  assert.match(javascript, /function renderServiceTopology\(\)/);
  assert.match(javascript, /sessionStorage\.setItem\(`\$\{STORAGE_PREFIX\}runtimeSamples`/);
  assert.match(javascript, /app\.view === "memory"[^\n]+refreshMemory/);
  assert.match(javascript, /\["overview", "channels", "intelligence", "settings"\][^\n]+refreshMaintenance/);
  assert.match(css, /\.topology-node\.ok i/);
  assert.match(css, /\.topology-node\.bad i/);
});

test("dashboard keeps real channel, memory, log, and network controls in the redesigned workspaces", () => {
  for (const className of ["event-table-head", "memory-shell", "log-filters", "settings-grid"]) {
    assert.match(html, new RegExp(`class="[^"]*${className}`));
  }
  assert.match(javascript, /class="connection-row/);
  assert.match(javascript, /memory-browser/);
  assert.match(javascript, /class="event-row"/);
  for (const id of ["qqToggle", "addGroupForm", "botSettingsForm", "memorySearch", "logFilterForm", "lanAccessToggle", "publicTunnelToggle"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
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
  assert.match(javascript, /app\.view === "activity" && app\.liveLogs &&[^\n]+now - app\.lastFetch\.logs >= 1_000/);
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
  assert.match(javascript, /tunnelToggle\.disabled = tunnelBusy \|\| !app\.state \|\| !localBrowser/);
  assert.match(javascript, /copyPublicTunnelToken"\)\.disabled = !tunnelRunning \|\| !network\.apiTokenConfigured \|\| !localBrowser/);
  assert.match(javascript, /publicTunnelEnableMessage/);
  assert.match(css, /\.public-tunnel-card\s*\{/);
});

test("dashboard preserves local interaction state across polling and page reloads", () => {
  assert.match(javascript, /sessionStorage\.setItem\(`\$\{STORAGE_PREFIX\}uiState`/);
  assert.match(javascript, /window\.addEventListener\("pagehide", persistDashboardUiState\)/);
  assert.match(javascript, /restoreDashboardUiState\(\);/);
  assert.match(javascript, /dirtyForms: new Set\(restoredUiState\.botSettingsDraft/);
  assert.match(javascript, /if \(!busy && !dirty && !form\.contains\(document\.activeElement\)\)/);
  assert.match(javascript, /if \(app\.busyKeys\.has\("groups"\)\) return/);
  assert.match(javascript, /if \(app\.busyKeys\.has\("memory"\)/);
  assert.match(javascript, /busyKey: `channel:\$\{channel\}`/);
  assert.match(css, /\.save-state\.dirty\s*\{/);
});

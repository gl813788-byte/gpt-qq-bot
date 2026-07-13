import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { qqCommandCatalog } from "../src/qq-command-catalog.js";

test("QQ menu excludes channel shutdown", () => {
  assert.equal(qqCommandCatalog.some((command) => command.key === "shutdown"), false);
  assert.equal(qqCommandCatalog.some((command) => /关闭QQ/i.test(command.menuLine || "")), false);
});

test("QQ menu settings are persisted before a reply send begins", async () => {
  const source = await readFile(new URL("../src/server.js", import.meta.url), "utf8");
  assert.equal(source.includes("afterSend: saveSettings"), false);

  const persistCall = "if (record.reply && commandAction?.beforeSend) await commandAction.beforeSend();";
  const persistIndex = source.indexOf(persistCall);
  const sendIndex = source.indexOf("const sendStartedAt = Date.now();", persistIndex);
  assert.notEqual(persistIndex, -1);
  assert.notEqual(sendIndex, -1);
  assert.ok(persistIndex < sendIndex);
});

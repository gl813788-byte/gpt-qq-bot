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

test("/stop pauses only the active reply while /newdialog still clears conversation state", async () => {
  const source = await readFile(new URL("../src/server.js", import.meta.url), "utf8");
  const stopStart = source.indexOf("function stopQqGenerationForEvent(event)");
  const stopEnd = source.indexOf("function preserveStoppedQqCodexSession", stopStart);
  const stopBody = source.slice(stopStart, stopEnd);
  assert.notEqual(stopStart, -1);
  assert.notEqual(stopEnd, -1);
  assert.match(stopBody, /qqReplySteering\.cancel\(scopeId\)/);
  assert.match(stopBody, /delete state\.qq\.pendingReplies\[scopeId\]/);
  assert.match(stopBody, /会话和上下文已保留/);
  assert.doesNotMatch(stopBody, /clearQqContextForEvent/);

  const commandStart = source.indexOf('if (isQqCommandAllowedForEvent("stop"');
  const commandEnd = source.indexOf('if (isQqCommandAllowedForEvent("newDialog"', commandStart);
  const stopCommand = source.slice(commandStart, commandEnd);
  assert.doesNotMatch(stopCommand, /clearQqContextForEvent/);

  const newDialogStart = commandEnd;
  const newDialogEnd = source.indexOf('if (isQqCommandAllowedForEvent("summary"', newDialogStart);
  assert.match(source.slice(newDialogStart, newDialogEnd), /clearQqContextForEvent/);
});

import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PayloadTooLargeError, readResponseJson, writeResponseBodyToFile } from "../src/bounded-stream.js";

test("streams a response to an atomically published file", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "bounded-stream-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = join(directory, "image.bin");
  const response = new Response(new Blob(["hello", "-", "world"]).stream(), {
    headers: { "content-length": "11" }
  });

  const result = await writeResponseBodyToFile(response, filePath, { maxBytes: 32 });
  assert.deepEqual(result, { path: filePath, bytes: 11 });
  assert.equal(await readFile(filePath, "utf8"), "hello-world");
  assert.deepEqual((await readdir(directory)).filter((name) => name.endsWith(".tmp")), []);
});

test("rejects a declared oversized response before publishing a file", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "bounded-stream-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = join(directory, "too-large.bin");
  const response = new Response("small", { headers: { "content-length": "100" } });

  await assert.rejects(
    writeResponseBodyToFile(response, filePath, { maxBytes: 10 }),
    (error) => error instanceof PayloadTooLargeError && error.code === "PAYLOAD_TOO_LARGE"
  );
  assert.deepEqual(await readdir(directory), []);
});

test("stops an unknown-length stream at the byte limit and removes partial output", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "bounded-stream-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const filePath = join(directory, "stream-too-large.bin");
  const response = new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(8));
      controller.enqueue(new Uint8Array(8));
      controller.close();
    }
  }));

  await assert.rejects(
    writeResponseBodyToFile(response, filePath, { maxBytes: 12 }),
    (error) => error instanceof PayloadTooLargeError
  );
  assert.deepEqual(await readdir(directory), []);
});

test("parses bounded JSON responses and rejects oversized bodies", async () => {
  assert.deepEqual(await readResponseJson(new Response('{"ok":true}')), { ok: true });
  await assert.rejects(
    readResponseJson(new Response("x".repeat(128)), { maxBytes: 64 }),
    (error) => error instanceof PayloadTooLargeError
  );
});

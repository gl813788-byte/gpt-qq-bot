import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";
import { HttpError, readBody } from "../src/http-utils.js";

function requestFrom(chunks, headers = {}) {
  const request = Readable.from(chunks);
  request.headers = headers;
  return request;
}

test("readBody accepts a chunked JSON object and empty bodies", async () => {
  assert.deepEqual(await readBody(requestFrom(["{\"value\":", "42}"])), { value: 42 });
  assert.deepEqual(await readBody(requestFrom([])), {});
});

test("readBody rejects malformed, non-object, and oversized payloads", async () => {
  await assert.rejects(readBody(requestFrom(["not-json"])), (error) => error instanceof HttpError && error.statusCode === 400);
  await assert.rejects(readBody(requestFrom(["[]"])), (error) => error instanceof HttpError && error.statusCode === 400);
  await assert.rejects(readBody(requestFrom(["12345"]), { maxBytes: 4 }), (error) => error instanceof HttpError && error.statusCode === 413);
});

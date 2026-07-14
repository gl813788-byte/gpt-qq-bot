import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";
import {
  corsHeaders,
  HttpError,
  isLoopbackHost,
  isLoopbackRequestHost,
  isRequestOriginAllowed,
  parseAllowedOrigins,
  readBody
} from "../src/http-utils.js";

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

test("readBody can require JSON content type for state-changing API requests", async () => {
  await assert.rejects(
    readBody(requestFrom(["{\"ok\":true}"], { "content-type": "text/plain" }), { requireJson: true }),
    (error) => error instanceof HttpError && error.statusCode === 415
  );
  assert.deepEqual(
    await readBody(requestFrom(["{\"ok\":true}"], { "content-type": "application/json; charset=utf-8" }), { requireJson: true }),
    { ok: true }
  );
});

test("CORS only reflects explicitly allowed local origins", () => {
  const allowed = parseAllowedOrigins("", ["http://127.0.0.1:3789", "http://[::1]:3789", "null"]);
  assert.equal(isRequestOriginAllowed("", allowed), true);
  assert.equal(isRequestOriginAllowed("http://127.0.0.1:3789", allowed), true);
  assert.equal(isRequestOriginAllowed("http://[::1]:3789", allowed), true);
  assert.equal(isRequestOriginAllowed("https://malicious.example", allowed), false);
  assert.deepEqual(corsHeaders("https://malicious.example", allowed), {});
  assert.deepEqual(corsHeaders("http://127.0.0.1:3789", allowed), {
    "access-control-allow-origin": "http://127.0.0.1:3789",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "authorization,content-type,x-codex-api-token,x-onebot-access-token",
    "access-control-max-age": "600",
    "vary": "origin"
  });
  assert.deepEqual(parseAllowedOrigins("https://one.example, https://one.example https://two.example/"), [
    "https://one.example",
    "https://two.example"
  ]);
});

test("recognizes loopback bindings", () => {
  assert.equal(isLoopbackHost("127.0.0.1"), true);
  assert.equal(isLoopbackHost("localhost"), true);
  assert.equal(isLoopbackHost("[::1]"), true);
  assert.equal(isLoopbackHost("0.0.0.0"), false);
  assert.equal(isLoopbackHost("192.168.1.20"), false);
  assert.equal(isLoopbackRequestHost("127.0.0.1:3789"), true);
  assert.equal(isLoopbackRequestHost("localhost:3789"), true);
  assert.equal(isLoopbackRequestHost("[::1]:3789"), true);
  assert.equal(isLoopbackRequestHost("127.0.0.1.example:3789"), false);
  assert.equal(isLoopbackRequestHost("evil.example:3789"), false);
  assert.equal(isLoopbackRequestHost(""), false);
});

import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { assertSafeUrl, createPinnedLookup, fetchWithUrlPolicy, isPrivateOrReservedAddress } from "../src/safe-fetch.js";

test("blocks local, private, reserved, credentialed, and unsafe protocol URLs", async () => {
  for (const url of [
    "http://127.0.0.1/image.png",
    "http://[::1]/image.png",
    "http://169.254.169.254/latest/meta-data",
    "file:///etc/passwd",
    "https://user:password@example.com/image.png"
  ]) {
    await assert.rejects(assertSafeUrl(url, { resolveHostname: async () => ["93.184.216.34"] }), (error) => error.code?.startsWith("URL_"));
  }
});

test("allows public addresses, approved local origins, and bounded data images", async () => {
  await assert.doesNotReject(assertSafeUrl("https://example.com/image.png", {
    resolveHostname: async () => ["93.184.216.34"]
  }));
  await assert.doesNotReject(assertSafeUrl("http://127.0.0.1:3000/image", {
    allowedOrigins: new Set(["http://127.0.0.1:3000"])
  }));
  await assert.doesNotReject(assertSafeUrl("data:image/png;base64,AA==", { allowDataImages: true }));
});

test("revalidates every redirect target", async () => {
  const fetchImpl = async () => new Response(null, {
    status: 302,
    headers: { location: "http://127.0.0.1/private" }
  });
  await assert.rejects(fetchWithUrlPolicy("https://example.com/start", {}, {
    fetchImpl,
    resolveHostname: async () => ["93.184.216.34"]
  }), (error) => error.code === "URL_PRIVATE_ADDRESS");
});

test("recognizes representative private and public IP ranges", () => {
  assert.equal(isPrivateOrReservedAddress("10.0.0.1"), true);
  assert.equal(isPrivateOrReservedAddress("fd00::1"), true);
  assert.equal(isPrivateOrReservedAddress("8.8.8.8"), false);
  assert.equal(isPrivateOrReservedAddress("::7f00:1"), true);
  assert.equal(isPrivateOrReservedAddress("64:ff9b::7f00:1"), true);
  assert.equal(isPrivateOrReservedAddress("2002:7f00:1::"), true);
  assert.equal(isPrivateOrReservedAddress("3fff::1"), true);
  assert.equal(isPrivateOrReservedAddress("2606:4700:4700::1111"), false);
});

test("pins requests to prevalidated DNS results", async () => {
  const pinnedLookup = createPinnedLookup(["93.184.216.34", "2606:2800:220:1:248:1893:25c8:1946"]);
  await new Promise((resolve, reject) => pinnedLookup("example.com", { family: 4 }, (error, address, family) => {
    if (error) return reject(error);
    assert.equal(address, "93.184.216.34");
    assert.equal(family, 4);
    resolve();
  }));
});

test("uses the pinned transport for an explicitly approved private origin", async (t) => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end('{"ok":true}');
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const response = await fetchWithUrlPolicy(`${origin}/status`, {}, { allowedPrivateOrigins: [origin] });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
});

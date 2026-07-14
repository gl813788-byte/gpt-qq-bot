import assert from "node:assert/strict";
import test from "node:test";
import { createDashboardAssetHandler, dashboardAssetRoutes } from "../src/dashboard-assets.js";

function createResponse() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value;
    },
    writeHead(statusCode) {
      this.statusCode = statusCode;
    },
    end(body) {
      this.body = body;
    }
  };
}

test("serves only known dashboard assets with browser security headers", async () => {
  const loads = [];
  const handler = createDashboardAssetHandler({
    directory: "/virtual/dashboard",
    loadAsset: async (path) => {
      loads.push(path);
      return Buffer.from(path.endsWith("client.html") ? "<main>Hub</main>" : "asset");
    }
  });
  const response = createResponse();

  assert.equal(await handler({ method: "GET", url: "/", headers: {} }, response), true);
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.toString(), "<main>Hub</main>");
  assert.equal(response.headers["x-content-type-options"], "nosniff");
  assert.match(response.headers["content-security-policy"], /frame-ancestors 'none'/);
  assert.ok(response.headers.etag);

  const missing = createResponse();
  assert.equal(await handler({ method: "GET", url: "/../server.js", headers: {} }, missing), false);
  assert.equal(loads.length, 1);
});

test("supports HEAD, conditional requests, and in-memory asset caching", async () => {
  let loads = 0;
  const handler = createDashboardAssetHandler({
    directory: "/virtual/dashboard",
    loadAsset: async () => {
      loads += 1;
      return Buffer.from("body");
    }
  });
  const first = createResponse();
  await handler({ method: "HEAD", url: "/client.css", headers: {} }, first);
  assert.equal(first.statusCode, 200);
  assert.equal(first.body, undefined);
  assert.equal(first.headers["content-length"], 4);

  const cached = createResponse();
  await handler({
    method: "GET",
    url: "/client.css",
    headers: { "if-none-match": first.headers.etag }
  }, cached);
  assert.equal(cached.statusCode, 304);
  assert.equal(loads, 1);
});

test("publishes the expected stable browser routes", () => {
  assert.deepEqual(dashboardAssetRoutes, ["/", "/dashboard", "/client.css", "/client.js"]);
});

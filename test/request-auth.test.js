import assert from "node:assert/strict";
import test from "node:test";
import { extractBearerToken, requestHasValidToken, safeTokenEqual } from "../src/request-auth.js";

test("accepts exact bearer and explicitly allowed alternative token headers", () => {
  assert.equal(requestHasValidToken({ headers: { authorization: "Bearer secret-value" } }, "secret-value"), true);
  assert.equal(requestHasValidToken({ headers: { "x-onebot-access-token": "secret-value" } }, "secret-value", {
    alternativeHeaders: ["x-onebot-access-token"]
  }), true);
  assert.equal(requestHasValidToken({ headers: { authorization: "Bearer wrong" } }, "secret-value"), false);
});

test("does not treat empty or malformed credentials as valid", () => {
  assert.equal(extractBearerToken("Basic abc"), "");
  assert.equal(safeTokenEqual("", ""), false);
  assert.equal(requestHasValidToken({ headers: {} }, ""), false);
});

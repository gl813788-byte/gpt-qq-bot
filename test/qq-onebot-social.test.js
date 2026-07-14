import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOneBotPokeAttempts,
  shouldImplicitlyPokeBack,
  summarizePokeFailures
} from "../src/qq-onebot-social.js";

test("builds NapCat-compatible poke attempts with an explicit target", () => {
  assert.deepEqual(buildOneBotPokeAttempts({ groupId: "1084253274", userId: "2577243154" }), [
    {
      endpoint: "send_poke",
      payload: { group_id: "1084253274", user_id: "2577243154", target_id: "2577243154" }
    },
    {
      endpoint: "group_poke",
      payload: { group_id: "1084253274", user_id: "2577243154", target_id: "2577243154" }
    }
  ]);
  assert.equal(buildOneBotPokeAttempts({ groupId: "bad", userId: "" }).length, 0);
});

test("recognizes a model's explicit poke-back intent only for poke events", () => {
  assert.equal(shouldImplicitlyPokeBack("拍回去，逮到你了。[[qq_done]]", { type: "group_poke" }), true);
  assert.equal(shouldImplicitlyPokeBack("回拍一下", { type: "private_poke" }), true);
  assert.equal(shouldImplicitlyPokeBack("拍回去", { type: "group_message" }), false);
  assert.equal(shouldImplicitlyPokeBack("我没有要拍回去，只是在解释这句话的意思。", { type: "group_poke" }), false);
});

test("keeps all poke endpoint errors for diagnosis", () => {
  assert.equal(summarizePokeFailures([
    { endpoint: "send_poke", ok: false, error: "packet unavailable" },
    { endpoint: "group_poke", ok: false, status: 500 }
  ]), "send_poke: packet unavailable；group_poke: HTTP 500");
});

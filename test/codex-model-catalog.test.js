import test from "node:test";
import assert from "node:assert/strict";
import { findCodexModel, normalizeCodexModels } from "../src/codex-model-catalog.js";

test("normalizes visible Codex models and their reasoning efforts", () => {
  const models = normalizeCodexModels([
    {
      id: "gpt-current",
      model: "gpt-current",
      displayName: "GPT Current",
      description: "Current model",
      hidden: false,
      isDefault: true,
      defaultReasoningEffort: "medium",
      supportedReasoningEfforts: [
        { reasoningEffort: "low", description: "Fast" },
        { reasoningEffort: "medium", description: "Balanced" }
      ]
    },
    { id: "hidden", model: "hidden", hidden: true }
  ]);

  assert.deepEqual(models, [{
    id: "gpt-current",
    model: "gpt-current",
    displayName: "GPT Current",
    description: "Current model",
    isDefault: true,
    defaultReasoningEffort: "medium",
    supportedReasoningEfforts: ["low", "medium"]
  }]);
});

test("finds a Codex model by picker number, id, or model slug", () => {
  const models = [
    { id: "first", model: "gpt-first" },
    { id: "second", model: "gpt-second" }
  ];
  assert.equal(findCodexModel(models, "2"), models[1]);
  assert.equal(findCodexModel(models, "FIRST"), models[0]);
  assert.equal(findCodexModel(models, "GPT-SECOND"), models[1]);
  assert.equal(findCodexModel(models, "3"), null);
});

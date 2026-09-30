import { test } from "node:test";
import assert from "node:assert/strict";
import { answerDemo, demoEnabled } from "../src/demo";
test("demonstration cannot activate in production or through a missing environment", () => {
  assert.equal(
    demoEnabled({ NODE_ENV: "production", CHAT_DEMO: "true" }),
    false,
  );
  assert.equal(demoEnabled({ CHAT_DEMO: "true" }), false);
  assert.equal(
    demoEnabled({ NODE_ENV: "development", CHAT_DEMO: "true" }),
    true,
  );
});
test("another city does not return the local fixture as its result", () => {
  const answer = answerDemo("Qual bairro de São Paulo tem mais câmeras?");
  assert.equal(answer.kind, "text");
  assert.equal("rows" in answer, false);
});
test("unrelated input has no invented analytical values", () => {
  assert.equal(answerDemo("Como fazer molho de tomate?").kind, "text");
});

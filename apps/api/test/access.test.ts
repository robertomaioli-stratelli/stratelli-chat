import { test } from "node:test";
import assert from "node:assert/strict";
import { access, homologEnabled } from "../src/access";
function request(
  env: NodeJS.ProcessEnv,
  authorization?: string,
  path = "/api/chat/session",
) {
  let code = 200,
    called = false;
  const res = {
    status(n: number) {
      code = n;
      return this;
    },
    json() {
      return this;
    },
    setHeader() {},
  };
  access(env)({ path, get: () => authorization } as never, res as never, () => {
    called = true;
  });
  return { code, called };
}
test("homolog exige modo explícito e senha mínima; produção não abre por CHAT_DEMO", () => {
  assert.equal(
    homologEnabled({
      APP_ENV: "homolog",
      CHAT_DEMO: "true",
      CHAT_BASIC_USER: "tester",
      CHAT_BASIC_PASSWORD: "short",
    }),
    false,
  );
  assert.equal(
    request({ NODE_ENV: "production", CHAT_DEMO: "true" }).code,
    503,
  );
  const env = {
    NODE_ENV: "production",
    APP_ENV: "homolog",
    CHAT_DEMO: "true",
    CHAT_BASIC_USER: "tester",
    CHAT_BASIC_PASSWORD: "test-only-long-password",
  };
  assert.equal(request(env).code, 401);
  assert.equal(
    request(env, "Basic " + Buffer.from("tester:wrong").toString("base64"))
      .code,
    401,
  );
  assert.equal(
    request(
      env,
      "Basic " +
        Buffer.from("tester:test-only-long-password").toString("base64"),
    ).called,
    true,
  );
  assert.equal(request(env, undefined, "/api/chat/health").called, true);
});

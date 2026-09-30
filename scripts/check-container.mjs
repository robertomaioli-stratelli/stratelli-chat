import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .trim()
    .split("\n")
    .map((line) => line.split("=")),
);
const headers = {
  Authorization:
    "Basic " +
    Buffer.from(env.CHAT_BASIC_USER + ":" + env.CHAT_BASIC_PASSWORD).toString(
      "base64",
    ),
  "Content-Type": "application/json",
};
const base = "http://127.0.0.1:3101";
assert.equal((await fetch(base + "/api/chat/session")).status, 401);
assert.equal((await fetch(base + "/chat/")).status, 401);
assert.equal((await fetch(base + "/api/chat/health")).status, 200);
assert.equal((await fetch(base + "/chat/", { headers })).status, 200);
const conversationId = crypto.randomUUID(),
  messageId = crypto.randomUUID();
const saved = await fetch(base + "/api/chat/messages", {
  method: "POST",
  headers,
  body: JSON.stringify({
    conversationId,
    messageId,
    question: "Câmeras: teste de persistência Docker",
  }),
});
assert.equal(saved.status, 201);
execFileSync("docker", ["compose", "restart", "chat"], { stdio: "pipe" });
let ready = false;
for (let i = 0; i < 30; i++) {
  try {
    ready = (await fetch(base + "/api/chat/ready", { headers })).ok;
    if (ready) break;
  } catch {}
  await new Promise((resolve) => setTimeout(resolve, 500));
}
assert.equal(ready, true);
const result = await fetch(
  base + "/api/chat/conversations/" + conversationId + "/messages",
  { headers },
);
assert.equal(result.status, 200);
assert.equal((await result.json())[0].id, messageId);
console.log(
  "Docker: interface protegida, saúde, banco e histórico após reinício OK.",
);

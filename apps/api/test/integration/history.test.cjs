const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { dataSource } = require("../../dist/database/source");
const { History } = require("../../dist/database/history");
const { createApp } = require("../../dist/app");
// Refuse accidental execution against a non-local database.
const target = new URL(
  process.env.CHAT_MIGRATION_DATABASE_URL || "http://invalid",
);
if (
  target.hostname !== "127.0.0.1" ||
  target.port !== "55433" ||
  target.pathname !== "/chat_local"
)
  throw Error("Use apenas o banco local isolado do Compose.");
let db, app, base;
const prefix = "test:" + randomUUID();
const scope = { userId: prefix, cityId: "4115200" };
const ids = [];
async function boot() {
  db = dataSource(true);
  await db.initialize();
  await db.runMigrations({ transaction: "all" });
  app = await createApp();
  await app.listen(0, "127.0.0.1");
  base = await app.getUrl();
}
const ready = boot();
after(async () => {
  if (app) await app.close();
  if (db?.isInitialized) {
    await db.query(
      "DELETE FROM chat_conversations WHERE user_id=$1 OR id=ANY($2::uuid[])",
      [prefix, ids],
    );
    await db.destroy();
  }
});
test("migração repetível, persistência e isolamento de usuário/cidade", async () => {
  await ready;
  assert.deepEqual(await db.runMigrations(), []);
  const repository = new History(db),
    conversationId = randomUUID(),
    messageId = randomUUID();
  const answer = { demo: true, text: "Resposta sintética" };
  await repository.save(
    scope,
    conversationId,
    messageId,
    "Pergunta sintética",
    answer,
    1,
  );
  await repository.save(
    scope,
    conversationId,
    messageId,
    "Pergunta sintética",
    answer,
    1,
  );
  assert.equal((await repository.messages(scope, conversationId)).length, 1);
  await assert.rejects(
    repository.save(
      scope,
      conversationId,
      messageId,
      "Pergunta diferente",
      answer,
      1,
    ),
  );
  assert.equal(
    (await repository.list({ ...scope, cityId: "3550308" })).length,
    0,
  );
  await assert.rejects(
    repository.messages({ ...scope, userId: "other" }, conversationId),
  );
  await assert.rejects(
    repository.save(
      { ...scope, cityId: "3550308" },
      conversationId,
      randomUUID(),
      "outro",
      answer,
      1,
    ),
  );
  await assert.rejects(
    repository.feedback(
      { ...scope, userId: "other" },
      messageId,
      "no",
      "intruso",
    ),
  );
  await repository.feedback(scope, messageId, "yes", "Bom");
  const fresh = dataSource();
  await fresh.initialize();
  try {
    const rows = await new History(fresh).messages(scope, conversationId);
    assert.equal(rows[0].feedback, "yes");
    assert.equal(rows[0].feedbackComment, "Bom");
  } finally {
    await fresh.destroy();
  }
  const runtime = dataSource();
  await runtime.initialize();
  try {
    await assert.rejects(
      runtime.query("CREATE TABLE should_not_create (id int)"),
    );
  } finally {
    await runtime.destroy();
  }
});
test("API valida corpo, rejeita origem estranha e devolve histórico persistido", async () => {
  await ready;
  const call = (path, body, origin) =>
    fetch(base + "/api/chat/" + path, {
      method: body ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
        ...(origin ? { Origin: origin } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  const conversationId = randomUUID(),
    messageId = randomUUID();
  ids.push(conversationId);
  const body = { question: "Câmeras de teste", conversationId, messageId };
  assert.equal(
    (await call("messages", { ...body, cityId: "3550308" })).status,
    400,
  );
  assert.equal(
    (await call("messages", body, "https://untrusted.invalid")).status,
    403,
  );
  assert.equal(
    (await call("messages", { ...body, question: "x".repeat(2001) })).status,
    400,
  );
  const response = await call("messages", body);
  assert.equal(response.status, 201);
  assert.equal((await response.json()).answer.demo, true);
  assert.equal(
    (
      await call("messages/" + messageId + "/feedback", {
        vote: "yes",
        comment: "Teste",
      })
    ).status,
    201,
  );
  const history = await (
    await call("conversations/" + conversationId + "/messages")
  ).json();
  assert.equal(history[0].feedback, "yes");
  assert.equal(history.length, 1);
  assert.equal((await call("ready")).status, 200);
});

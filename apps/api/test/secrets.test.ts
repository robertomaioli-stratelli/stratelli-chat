import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSecrets } from "../src/secrets";

test("segredos montados são carregados e configuração ambígua é rejeitada", () => {
  const dir = mkdtempSync(join(tmpdir(), "chat-secrets-"));
  try {
    const file = join(dir, "password");
    writeFileSync(file, "synthetic-test-password\n");
    assert.equal(
      loadSecrets({ CHAT_BASIC_PASSWORD_FILE: file }).CHAT_BASIC_PASSWORD,
      "synthetic-test-password",
    );
    assert.throws(() =>
      loadSecrets({
        CHAT_BASIC_PASSWORD_FILE: file,
        CHAT_BASIC_PASSWORD: "conflicting",
      }),
    );
    assert.throws(() =>
      loadSecrets({ CHAT_BASIC_PASSWORD_FILE: join(dir, "missing") }),
    );
  } finally {
    rmSync(dir, { recursive: true });
  }
});

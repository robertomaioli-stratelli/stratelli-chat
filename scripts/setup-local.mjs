import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const file = ".env";
if (!existsSync(file)) {
  writeFileSync(
    file,
    `CHAT_DB_OWNER_PASSWORD=${randomBytes(24).toString("hex")}\nCHAT_DB_APP_PASSWORD=${randomBytes(24).toString("hex")}\nCHAT_BASIC_USER=chat-local\nCHAT_BASIC_PASSWORD=${randomBytes(24).toString("hex")}\n`,
    { mode: 0o600 },
  );
}
const env = Object.fromEntries(
  readFileSync(file, "utf8")
    .trim()
    .split("\n")
    .map((line) => line.split("=")),
);
const target = "apps/api/.env.development";
if (
  !existsSync(target) ||
  !readFileSync(target, "utf8").includes("CHAT_DATABASE_URL")
) {
  const previous = existsSync(target) ? readFileSync(target, "utf8") : "";
  if (previous)
    writeFileSync(`${target}.before-database`, previous, { mode: 0o600 });
  writeFileSync(
    target,
    `NODE_ENV=development\nCHAT_DEMO=true\nHOST=127.0.0.1\nPORT=3100\nCHAT_ALLOWED_ORIGINS=http://127.0.0.1:5173,http://localhost:5173\nCHAT_DATABASE_URL=postgresql://chat_app:${env.CHAT_DB_APP_PASSWORD}@127.0.0.1:55433/chat_local\nCHAT_MIGRATION_DATABASE_URL=postgresql://chat_owner:${env.CHAT_DB_OWNER_PASSWORD}@127.0.0.1:55433/chat_local\n`,
    { mode: 0o600 },
  );
}
console.log(
  "Configuração local pronta. Credenciais estão em .env (não versionado).",
);

import { readFileSync } from "node:fs";

/** Supports mounted Docker secrets without exposing their values in app settings. */
export function loadSecrets(env: NodeJS.ProcessEnv) {
  for (const name of [
    "CHAT_DATABASE_URL",
    "CHAT_MIGRATION_DATABASE_URL",
    "CHAT_BASIC_PASSWORD",
  ]) {
    const file = env[`${name}_FILE`];
    if (file && env[name])
      throw new Error(`Configure somente ${name} ou ${name}_FILE.`);
    if (file) env[name] = readFileSync(file, "utf8").trim();
  }
  return env;
}

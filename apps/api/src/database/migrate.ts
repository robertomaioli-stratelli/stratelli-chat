import { loadSecrets } from "../secrets";
import { dataSource } from "./source";
async function migrate() {
  loadSecrets(process.env);
  const db = dataSource(true);
  try {
    await db.initialize();
    await db.runMigrations({ transaction: "all" });
    console.log("Migrações do Chat concluídas.");
  } finally {
    if (db.isInitialized) await db.destroy();
  }
}
void migrate().catch(() => {
  console.error(
    "Falha na migração. Confira banco próprio, conectividade e permissões.",
  );
  process.exitCode = 1;
});

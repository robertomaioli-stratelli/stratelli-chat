import "reflect-metadata";
import { DataSource } from "typeorm";
import { History1790760000000 } from "./migration";
export function dataSource(migration = false) {
  const url = migration
    ? process.env.CHAT_MIGRATION_DATABASE_URL
    : process.env.CHAT_DATABASE_URL;
  if (!url) throw new Error("Configure o acesso ao banco próprio do Chat.");
  return new DataSource({
    type: "postgres",
    url,
    migrations: [History1790760000000],
    migrationsTableName: "chat_migrations",
    synchronize: false,
    logging: false,
    ssl:
      process.env.CHAT_DB_SSL === "true" ? { rejectUnauthorized: true } : false,
    extra: { max: 5, connectionTimeoutMillis: 5000, statement_timeout: 5000 },
  });
}

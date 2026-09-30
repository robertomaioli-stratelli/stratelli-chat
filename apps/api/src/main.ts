import { createApp } from "./app";
async function main() {
  const app = await createApp();
  await app.listen(
    Number(process.env.PORT || 3100),
    process.env.HOST || "127.0.0.1",
  );
}
void main().catch(() => {
  console.error(
    "Não foi possível iniciar o Chat. Verifique configuração e conectividade do banco próprio.",
  );
  process.exitCode = 1;
});

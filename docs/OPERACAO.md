# Operação do Chat

## Entrega e versionamento

`homolog` é a branch de desenvolvimento e entrega para homologação. `main` fica reservada à versão estável. Publicação é uma ação separada; a CI deste projeto não executa deploy.

Versões seguem `MAJOR.MINOR.PATCH`: funcionalidade nova aumenta MINOR, correção aumenta PATCH; alterações incompatíveis exigem revisão do MAJOR. Antes de 1.0, o contrato ainda está em evolução. Atualizar os três `package.json`, o lockfile e o changelog juntos. Commits usam descrição curta com `feat:`, `fix:`, `docs:` ou `test:`. Tags de lançamento somente após validar os gatilhos de publicação e aprovar a entrega.

## Serviços

1. Aplicação: um contêiner Docker com interface e API, porta interna **3100**, sem volume persistente.
2. PostgreSQL: banco exclusivo do Chat; pode residir em um serviço PostgreSQL existente, com usuários e permissões próprios. O Compose cria PostgreSQL 18 apenas para desenvolvimento local.

Na homologação, encaminhar `/chat/` e `/api/chat/` ao contêiner do Chat preservando os caminhos. O frontend atual chama a API na mesma origem. Não habilitar rotas que substituam a API do painel. A autenticação futura exige validar o contrato do painel; apenas compartilhar domínio não autentica o Chat.

Reserva inicial proposta: aplicação com 512 MiB de RAM e 0,5 CPU. É um limite inicial para homologação, não resultado de teste de carga. Medir consumo sob uso real. O build precisa de recursos adicionais; preferir construir fora do servidor compartilhado. Incluir o consumo do banco e dos demais serviços no dimensionamento do host.

## Variáveis da aplicação

| Variável | Uso |
| --- | --- |
| `HOST`, `PORT` | A imagem define `0.0.0.0` e `3100`. |
| `NODE_ENV` | `production` no contêiner. |
| `APP_ENV`, `CHAT_DEMO` | Para o piloto protegido: `homolog` e `true`. Sem modo autorizado, o acesso é bloqueado. |
| `CHAT_BASIC_USER`, `CHAT_BASIC_PASSWORD` | Conta temporária de homologação; senha com pelo menos 16 caracteres. Usar HTTPS no proxy. |
| `CHAT_DATABASE_URL` | Conexão do usuário de execução com o banco exclusivo do Chat. |
| `CHAT_MIGRATION_DATABASE_URL` | Conexão com permissão de DDL, somente no processo de migração. |
| `CHAT_DB_SSL` | `true` quando o banco exigir TLS; valida o certificado. |
| `CHAT_ALLOWED_ORIGINS` | Origens exatas permitidas para escrita, separadas por vírgula, sem barra final. |

Não colocar segredos no Git nem em variáveis `VITE_*`. As chaves de IA e a conexão de leitura da plataforma serão variáveis adicionais ao implementar os respectivos conectores. Ainda não existem testes desses conectores nesta entrega.

## Banco e migração

O banco guarda duas tabelas de negócio:

- `chat_conversations`: UUID, identidade do usuário, código IBGE do município, título e datas de criação/atualização.
- `chat_messages`: UUID, conversa, pergunta, resposta estruturada JSON, provedor/modelo, tokens, latência, avaliação, comentário e datas. Tokens/modelo ficam nulos enquanto não há IA real.

`chat_migrations` controla as migrações aplicadas. A listagem traz as 100 conversas recentes, com até 200 perguntas por conversa. IDs repetidos da mesma mensagem são idempotentes. Perguntas iguais em conversas ou mensagens diferentes continuam sendo registros distintos; isso não implementa deduplicação de boletins da base original.

O usuário de execução precisa de `CONNECT` no banco, `USAGE` no schema e `SELECT/INSERT/UPDATE/DELETE` nas tabelas do Chat; não precisa criar tabelas. O usuário de migração precisa criar/alterar objetos nesse banco. Não usar uma conexão da plataforma como conexão de migração.

No Compose a migração é automática, antes da aplicação. No servidor, executar como etapa explícita da entrega, com a imagem da mesma versão, no banco próprio previamente provisionado:

```sh
node apps/api/dist/database/migrate.js
```

O comando usa `CHAT_MIGRATION_DATABASE_URL`, aplica apenas migrações pendentes e não utiliza sincronização automática do schema. Fazer backup antes de atualizar um banco com dados. Rollback de código não desfaz migração automaticamente.

## Saúde e continuidade

- `GET /api/chat/health`: processo HTTP respondendo, sem credencial.
- `GET /api/chat/ready`: consulta o schema do banco próprio, exige acesso. Não certifica IA nem a base da plataforma.

Manter backup do banco fora do volume, com retenção acordada e restauração testada. `docker compose down` preserva os dados locais; **não usar `down -v`** se precisar mantê-los. A conta temporária não substitui permissões individuais nem o login do painel. Antes de uso real, concluir essa integração e definir retenção/exclusão dos históricos.

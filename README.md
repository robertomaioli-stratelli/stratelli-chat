# Stratelli Chat

React/Vite + TypeScript, API NestJS/TypeORM e PostgreSQL. Uma imagem Docker serve a interface em `/chat/` e a API em `/api/chat/`, na porta 3100.

## Executar localmente

Requisitos: Node.js 22.12+ e Docker com Compose.

```sh
npm ci
npm run setup:local
npm run docker:up
```

Abra http://127.0.0.1:3101/chat/. O usuário e a senha de teste estão no `.env` local (`CHAT_BASIC_USER` e `CHAT_BASIC_PASSWORD`). O script gera senhas aleatórias, sem versioná-las. O Compose cria um PostgreSQL isolado, aplica a migração e inicia a aplicação.

Para editar com atualização automática:

```sh
npm run build
npm run dev
```

Abra http://127.0.0.1:5173/chat/. Esse modo usa o mesmo banco local, com identidade de desenvolvimento separada e sem login. As portas do Compose ficam restritas a `127.0.0.1`. Para encerrar os contêineres, use `npm run docker:down`; o volume do banco é preservado.

## Verificar

Com o banco local em execução:

```sh
npm run check
npm run test:integration
npm run test:docker
```

Os testes cobrem validação de perguntas, acesso, persistência, isolamento de usuário/cidade, avaliação das respostas, repetição segura de uma mensagem e histórico após reinício do contêiner. A CI executa build e testes, sem publicar. O roteiro visual está em [TESTES.md](docs/TESTES.md).

## O que está pronto

Interface responsiva, temas, tamanho de fonte, gráficos e tabelas demonstrativos, fontes, cópia e avaliações. Conversas, respostas e avaliações ficam no PostgreSQL; preferências visuais ficam no navegador. A versão do rodapé vem do `package.json` da raiz, inserida no build.

**As respostas ainda usam dados fictícios.** IA, consulta à base da plataforma, autenticação do painel e ditado real continuam pendentes. A conta básica de homologação é compartilhada: todos que usam essa conta veem o mesmo histórico de testes de Maringá. Não utilizar para dados reais de usuários. O isolamento por identidade e município já existe na camada de persistência; sua ligação ao login real ainda será implementada.

## Organização e entrega

- `apps/web`: interface e recursos visuais do Chat.
- `apps/api`: API, banco, migração e testes.
- `Dockerfile` e `captain-definition`: imagem única para CapRover.
- `compose.yaml`: ambiente local reproduzível, com banco e migração.

Consulte [OPERAÇÃO.md](docs/OPERACAO.md) para variáveis, banco, publicação e versão. Os logotipos InPacta são versões azul e negativa, com fundo transparente, extraídas do material de marca fornecido.

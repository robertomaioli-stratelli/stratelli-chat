# Verificação de uma entrega

## Automatizada

1. `npm run check`: compilação TypeScript, build da interface e testes unitários.
2. `npm run test:integration`: banco isolado, migrações, histórico, avaliações, acesso por usuário/cidade e validação HTTP. Recusa alvo diferente do PostgreSQL local do Compose. Remove os registros gerados pelos testes.
3. `npm run test:docker`: acesso protegido, interface, saúde, gravação e leitura após reiniciar a aplicação. Deixa uma conversa sintética identificada para inspeção.

Preparação: `npm ci`, `npm run setup:local` e `npm run docker:up`. Nenhum desses testes acessa o banco da plataforma ou um provedor de IA.

## Interface

Verificar em desktop e celular, com tema claro e escuro:

- Logotipo legível, sem fundo branco; fonte normal/ampliada; versão no rodapé.
- Histórico recolhível, cabeçalho e campo de pergunta visíveis, rolagens independentes, sem transbordamento horizontal.
- Enviar pergunta, observar o estado de espera, ver texto/tabela/gráfico e abrir fontes.
- Copiar resposta; avaliar e comentar; recarregar e abrir a conversa para conferir persistência.
- Nova conversa abre tela vazia. Falha de envio permite tentar novamente sem duplicar a mensagem.

Resultados desta entrega: build, testes unitários, integração e reinício Docker verificados localmente. No navegador foram conferidos envio, avaliação e recuperação após recarregar, versão 0.2.0 e layout a 390 × 844, sem transbordamento horizontal. O estado de espera usa fixtures rápidas; não houve teste de streaming de IA. Não confundir testes de fixtures com validação de indicadores reais.

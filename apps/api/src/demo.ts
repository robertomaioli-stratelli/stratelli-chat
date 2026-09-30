// Fixtures only. Never import these into a real analytical data adapter.
export function demoEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.NODE_ENV === "development" && env.CHAT_DEMO === "true";
}
export function answerDemo(question: string) {
  const text = question
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  const base = { demo: true as const, city: "Maringá", cityId: "4115200" };
  if (/\b(bahia|salvador|sao paulo|guaruja|curitiba|londrina)\b/.test(text))
    return {
      ...base,
      kind: "text",
      text: "Esta conversa está dedicada a Maringá. Você pode explorar os equipamentos e registros de segurança da cidade.",
    };
  if (/\b(camera|cameras)\b/.test(text))
    return {
      ...base,
      kind: /compar|tabela/.test(text) ? "table" : "chart",
      text: "Neste exemplo fictício, o Bairro A concentra mais câmeras cadastradas: 48 unidades.",
      title: "Câmeras cadastradas por bairro",
      unit: "câmeras cadastradas",
      rows: [
        { label: "Bairro A", value: 48 },
        { label: "Bairro B", value: 32 },
        { label: "Bairro C", value: 20 },
      ],
      source: "Inventário demonstrativo",
      period: "Janeiro de 2026",
      calculation:
        "Comparação de valores fictícios por bairro. Nenhuma consulta à base de Maringá foi executada. Cadastro não informa funcionamento em tempo real.",
    };
  if (/ocorrencia|crime|registro|seguranca/.test(text))
    return {
      ...base,
      kind: "text",
      text: "Na demonstração, você pode explorar a distribuição de câmeras por bairro. As análises de ocorrências serão disponibilizadas após a integração e validação das consultas.",
    };
  return {
    ...base,
    kind: "text",
    text: "Nosso assunto aqui é a segurança de Maringá. Experimente perguntar: “Qual bairro tem mais câmeras cadastradas?”. Nesta versão, os resultados são demonstrativos.",
  };
}

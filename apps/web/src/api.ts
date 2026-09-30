export async function api<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/chat/${path}`, {
    credentials: "same-origin",
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new Error(
      response.status === 503
        ? "O Chat ainda não está disponível. Tente novamente mais tarde."
        : "Não foi possível concluir agora. Tente novamente.",
    );
  return response.json();
}

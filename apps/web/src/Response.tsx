import { useState } from "react";
import { Copy, MessagesSquare, ThumbsDown, ThumbsUp } from "lucide-react";
import { api } from "./api";
import type { Answer } from "./types";
export function Response({
  answer,
  notify,
  messageId,
  initialVote,
  initialComment,
}: {
  answer: Answer;
  messageId: string;
  initialVote?: "yes" | "no" | null;
  initialComment?: string | null;
  notify: (s: string) => void;
}) {
  const [vote, setVote] = useState<"yes" | "no" | null>(initialVote || null);
  const [comment, setComment] = useState(initialComment || "");
  const [saved, setSaved] = useState(!!initialVote);
  const [saving, setSaving] = useState(false);
  const maximum = Math.max(...(answer.rows || []).map((row) => row.value), 1);
  async function copy() {
    const text = [
      answer.text,
      ...(answer.rows || []).map(
        (row) => `${row.label}: ${row.value} ${answer.unit}`,
      ),
      answer.source && `Fonte: ${answer.source} · ${answer.period}`,
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      notify("Resposta copiada.");
    } catch {
      notify("Selecione o texto da resposta para copiar.");
    }
  }
  return (
    <div className="answer">
      <div className="answer-title">
        <MessagesSquare aria-hidden />
        <h3>
          Chat <span className="muted small">· {answer.city}</span>
        </h3>
      </div>
      <p className="answer-text">{answer.text}</p>
      {answer.rows && (
        <div className="data-block">
          <h3>{answer.title}</h3>
          <p className="muted small">
            Dados fictícios · {answer.period} · {answer.unit}
          </p>
          {answer.kind === "table" ? (
            <table>
              <caption className="sr-only">{answer.title}</caption>
              <thead>
                <tr>
                  <th scope="col">Bairro</th>
                  <th scope="col">Câmeras</th>
                </tr>
              </thead>
              <tbody>
                {answer.rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div
              role="img"
              aria-label={answer.rows
                .map((row) => `${row.label}: ${row.value} câmeras`)
                .join("; ")}
            >
              {answer.rows.map((row) => (
                <div className="bar-row" key={row.label}>
                  <span>{row.label}</span>
                  <div className="track">
                    <div
                      className="bar"
                      style={{ width: `${(row.value / maximum) * 100}%` }}
                    />
                  </div>
                  <span>{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {answer.source && (
        <>
          <p className="small muted">
            Fonte: {answer.source} · referência: {answer.period}
          </p>
          <details>
            <summary>Ver fontes e cálculo</summary>
            <div className="source-content">
              <p>{answer.calculation}</p>
              <p>Unidade: {answer.unit}.</p>
            </div>
          </details>
        </>
      )}
      <div className="response-actions">
        <button onClick={copy}>
          <Copy aria-hidden />
          Copiar resposta
        </button>
        <button
          aria-pressed={vote === "yes"}
          onClick={() => {
            setVote("yes");
            setSaved(false);
          }}
        >
          <ThumbsUp aria-hidden />
          Foi útil
        </button>
        <button
          aria-pressed={vote === "no"}
          onClick={() => {
            setVote("no");
            setSaved(false);
          }}
        >
          <ThumbsDown aria-hidden />
          Não foi útil
        </button>
      </div>
      {vote && !saved && (
        <form
          className="feedback"
          onSubmit={async (event) => {
            event.preventDefault();
            if (saving) return;
            setSaving(true);
            try {
              await api(`messages/${messageId}/feedback`, { vote, comment });
              setSaved(true);
              notify("Obrigado pela avaliação.");
            } catch {
              notify("Não foi possível salvar sua avaliação. Tente novamente.");
            } finally {
              setSaving(false);
            }
          }}
        >
          <label>
            Quer acrescentar algo? <span className="muted small">Opcional</span>
            <input
              value={comment}
              maxLength={1000}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Conte o que podemos melhorar…"
            />
          </label>
          <button type="submit" disabled={saving}>
            {saving ? "Salvando…" : "Concluir avaliação"}
          </button>
        </form>
      )}
      {saved && <p className="small muted">Obrigado pela avaliação.</p>}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowUp,
  Cctv,
  ChartNoAxesCombined,
  Compass,
  MapPin,
  LoaderCircle,
  MessageSquare,
  Mic,
  PanelLeft,
  Plus,
  SunMoon,
  Table2,
} from "lucide-react";

import type { Answer, Exchange, Conversation, Session } from "./types";
import { Response } from "./Response";
import { api } from "./api";
const suggestions = [
  {
    icon: Cctv,
    topic: "Monitoramento",
    question: "Qual bairro tem mais câmeras cadastradas?",
  },
  {
    icon: ChartNoAxesCombined,
    topic: "Ocorrências",
    question: "Como os registros mudaram ao longo do tempo?",
  },
  {
    icon: Table2,
    topic: "Comparação",
    question: "Compare a quantidade de câmeras entre bairros.",
  },
  {
    icon: Compass,
    topic: "Explore",
    question: "O que posso consultar sobre Maringá?",
  },
];
function preference(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function persist(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* preferences are optional */
  }
}
export function App() {
  const [theme, setTheme] = useState(
    () =>
      preference("theme") ||
      (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"),
  );
  const [large, setLarge] = useState(
    () => preference("ui:font-size") === "large",
  );
  const [sidebar, setSidebar] = useState(() => innerWidth > 650);
  const [mobile, setMobile] = useState(() => innerWidth <= 650);
  const [viewportHeight, setViewportHeight] = useState(
    () => window.visualViewport?.height || innerHeight,
  );
  useEffect(() => {
    const query = matchMedia("(max-width: 650px)");
    const breakpoint = () => {
      setMobile(query.matches);
      setSidebar(!query.matches);
    };
    const resize = () =>
      setViewportHeight(window.visualViewport?.height || innerHeight);
    query.addEventListener("change", breakpoint);
    window.visualViewport?.addEventListener("resize", resize);
    window.addEventListener("resize", resize);
    return () => {
      query.removeEventListener("change", breakpoint);
      window.visualViewport?.removeEventListener("resize", resize);
      window.removeEventListener("resize", resize);
    };
  }, []);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionError, setSessionError] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [micDemo, setMicDemo] = useState(false);
  const lock = useRef(false);
  const stage = useRef<HTMLDivElement>(null);
  const current = conversations.find((c) => c.id === active);
  useEffect(() => {
    let live = true;
    api<Session>("session")
      .then(async (s) => {
        if (!live) return;
        const list =
          await api<Omit<Conversation, "exchanges">[]>("conversations");
        if (live) {
          setConversations(list.map((c) => ({ ...c, exchanges: [] })));
          setSession(s);
        }
      })
      .catch((e) => {
        if (live) setSessionError(e.message);
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    persist("theme", theme);
  }, [theme]);
  useEffect(() => {
    persist("ui:font-size", large ? "large" : "normal");
  }, [large]);
  useEffect(() => {
    if (current?.exchanges.length)
      stage.current?.scrollTo({
        top:
          (
            stage.current.querySelector(
              ".exchange:last-child",
            ) as HTMLElement | null
          )?.offsetTop || 0,
      });
    else stage.current?.scrollTo({ top: 0 });
  }, [active, current?.exchanges.length, pending]);
  async function openConversation(id: string) {
    setActive(id);
    setQuestion("");
    setLoadingHistory(id);
    if (innerWidth <= 650) setSidebar(false);
    try {
      const exchanges = await api<Exchange[]>(`conversations/${id}/messages`);
      setConversations((cs) =>
        cs.map((c) => (c.id === id ? { ...c, exchanges } : c)),
      );
    } catch {
      setNotice("Não foi possível carregar a conversa. Tente novamente.");
    } finally {
      setLoadingHistory((previous) => (previous === id ? null : previous));
    }
  }
  function newChat() {
    setActive(null);
    setQuestion("");
    setMicDemo(false);
    if (innerWidth <= 650) setSidebar(false);
  }
  async function send(text: string, retryId?: string) {
    text = text.trim();
    if (
      !text ||
      text.length > 2000 ||
      lock.current ||
      loadingHistory ||
      !session
    )
      return;
    lock.current = true;
    setPending(true);
    setNotice("");
    const conversationId = active || crypto.randomUUID(),
      messageId = retryId || crypto.randomUUID();
    const exchange: Exchange = { id: messageId, question: text };
    if (!active) {
      setConversations((cs) => [
        { id: conversationId, title: text, exchanges: [exchange] },
        ...cs,
      ]);
      setActive(conversationId);
    } else
      setConversations((cs) =>
        cs.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                exchanges: retryId
                  ? c.exchanges.map((e) => (e.id === retryId ? exchange : e))
                  : [...c.exchanges, exchange],
              }
            : c,
        ),
      );
    setQuestion("");
    if (innerWidth <= 650) setSidebar(false);
    try {
      const { answer } = await api<{ answer: Answer }>("messages", {
        question: text,
        conversationId,
        messageId,
      });
      setConversations((cs) =>
        cs.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                exchanges: c.exchanges.map((e) =>
                  e.id === messageId ? { ...e, answer } : e,
                ),
              }
            : c,
        ),
      );
    } catch (error) {
      setConversations((cs) =>
        cs.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                exchanges: c.exchanges.map((e) =>
                  e.id === messageId
                    ? {
                        ...e,
                        error:
                          error instanceof Error
                            ? error.message
                            : "Falha na consulta.",
                      }
                    : e,
                ),
              }
            : c,
        ),
      );
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return (
    <main
      id="st-chat"
      data-theme={theme}
      style={{
        height: viewportHeight,
        colorScheme: theme === "dark" ? "dark" : "light",
        fontSize: large ? "18.5px" : "16px",
      }}
    >
      <div className={`shell ${sidebar ? "" : "closed"}`}>
        {sidebar && (
          <aside aria-label="Histórico de conversas">
            <button className="close-history" onClick={() => setSidebar(false)}>
              Fechar histórico
            </button>
            <div className="brand">
              <img
                className="light-logo"
                src="/chat/inpacta-light.svg"
                alt="InPacta"
              />
              <img
                className="dark-logo"
                src="/chat/inpacta-dark.svg"
                alt="InPacta"
              />
              <span>by STRATELLI</span>
            </div>
            <button className="new" onClick={newChat}>
              <Plus aria-hidden />
              Nova conversa
            </button>
            <nav className="history" aria-label="Histórico de conversas">
              <p className="history-label">Conversas</p>
              {!conversations.length ? (
                <p className="small muted">Suas conversas aparecerão aqui.</p>
              ) : (
                conversations.map((c) => (
                  <button
                    key={c.id}
                    disabled={pending || !!loadingHistory}
                    aria-current={active === c.id}
                    onClick={() => {
                      void openConversation(c.id);
                    }}
                  >
                    <MessageSquare aria-hidden />
                    <span>
                      {c.title.length > 48
                        ? `${c.title.slice(0, 48)}…`
                        : c.title}
                    </span>
                  </button>
                ))
              )}
            </nav>
            <div className="mobile-preferences" aria-label="Aparência">
              <button onClick={() => setLarge(!large)} aria-pressed={large}>
                Ajustar fonte {large ? "A−" : "A+"}
              </button>
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                <SunMoon aria-hidden />
                Tema {theme === "dark" ? "claro" : "escuro"}
              </button>
            </div>
            <div className="side-bottom">
              <span className="avatar">DE</span>
              <div>
                <p className="small">
                  {session?.user.name || "Acesso em preparação"}
                </p>
                <p className="muted small">{session?.city.name || "Chat"}</p>
              </div>
            </div>
          </aside>
        )}
        <section
          className="workspace"
          aria-label="Conversa"
          inert={mobile && sidebar}
        >
          <header>
            <div className="head-left">
              <button
                onClick={() => setSidebar(!sidebar)}
                aria-label={sidebar ? "Recolher histórico" : "Abrir histórico"}
                aria-expanded={sidebar}
              >
                <PanelLeft aria-hidden />
              </button>
              <h2>Chat</h2>
              {session && (
                <span className="city">
                  <MapPin aria-hidden />
                  {session.city.name}
                </span>
              )}
            </div>
            <div className="head-tools">
              {!sidebar && (
                <button onClick={newChat} aria-label="Nova conversa">
                  <Plus aria-hidden />
                </button>
              )}
              <button
                className="desktop-preference"
                onClick={() => setLarge(!large)}
                aria-pressed={large}
                aria-label={
                  large
                    ? "Diminuir tamanho da fonte"
                    : "Aumentar tamanho da fonte"
                }
              >
                {large ? "A−" : "A+"}
              </button>
              <button
                className="desktop-preference"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Alternar claro e escuro"
              >
                <SunMoon aria-hidden />
              </button>
              {session && !session.demo && (
                <a className="back" href="/" aria-label="Voltar ao painel">
                  <ArrowLeft aria-hidden />
                  <span>Voltar ao painel</span>
                </a>
              )}
            </div>
          </header>
          {sessionError && (
            <p className="status" role="alert">
              {sessionError}
            </p>
          )}
          <div className="stage" ref={stage}>
            {!current ? (
              <div className="welcome">
                <p className="eyebrow">
                  Segurança pública{session && ` · ${session.city.name}`}
                </p>
                <h1>
                  O que você quer <br />
                  entender sobre a cidade?
                </h1>
                <p className="intro">
                  Explore os dados de segurança de{" "}
                  {session?.city.name || "sua cidade"}. Faça uma pergunta e veja
                  os resultados com suas fontes e referências.
                </p>
                <div className="suggestions">
                  {suggestions.map(({ icon: Icon, topic, question: q }) => (
                    <button
                      key={topic}
                      className="suggestion"
                      disabled={!session || pending}
                      onClick={() => send(q)}
                    >
                      <span className="topic">
                        <Icon aria-hidden />
                        {topic}
                      </span>
                      <span>{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="conversation">
                {loadingHistory === active && (
                  <p role="status">Carregando conversa…</p>
                )}
                {current.exchanges.map((e) => (
                  <article className="exchange" key={e.id}>
                    <p className="question">{e.question}</p>
                    {e.answer ? (
                      <Response
                        answer={e.answer}
                        messageId={e.id}
                        initialVote={e.feedback}
                        initialComment={e.feedbackComment}
                        notify={setNotice}
                      />
                    ) : e.error ? (
                      <div role="alert">
                        <p>{e.error}</p>
                        <button
                          disabled={pending}
                          onClick={() => send(e.question, e.id)}
                        >
                          Tentar novamente
                        </button>
                      </div>
                    ) : (
                      <div
                        className="generating"
                        role="status"
                        aria-live="polite"
                      >
                        <LoaderCircle className="spinner" aria-hidden />
                        <div>
                          <strong>Preparando resposta</strong>
                          <p>Aguarde um instante…</p>
                        </div>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
          <div className="composer-area">
            {micDemo && (
              <div className="mic-box">
                <p>Simulação de ditado: nenhum áudio será gravado.</p>
                <div className="choices">
                  <button
                    onClick={() => {
                      setQuestion(suggestions[0].question);
                      setMicDemo(false);
                      setNotice(
                        "Texto de exemplo inserido. Revise antes de enviar.",
                      );
                    }}
                  >
                    Inserir texto de exemplo
                  </button>
                  <button onClick={() => setMicDemo(false)}>Cancelar</button>
                </div>
              </div>
            )}
            <form
              className="composer"
              onSubmit={(e) => {
                e.preventDefault();
                void send(question);
              }}
            >
              <textarea
                aria-label="Sua pergunta"
                placeholder={
                  session
                    ? `Pergunte sobre ${session.city.name}…`
                    : "Aguardando acesso…"
                }
                disabled={!session}
                maxLength={2000}
                rows={mobile ? 1 : 2}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    void send(question);
                  }
                }}
              />
              <div className="composer-actions">
                <button
                  type="button"
                  disabled={!session || pending}
                  onClick={() => setMicDemo(!micDemo)}
                  aria-label="Experimentar ditado demonstrativo"
                >
                  <Mic aria-hidden />
                  <span className="small">Ditar · prévia</span>
                </button>
                <button
                  className="send"
                  type="submit"
                  disabled={
                    !session || pending || !!loadingHistory || !question.trim()
                  }
                >
                  {pending ? (
                    <>
                      Aguarde
                      <LoaderCircle className="spinner" aria-hidden />
                    </>
                  ) : (
                    <>
                      Enviar
                      <ArrowUp aria-hidden />
                    </>
                  )}
                </button>
              </div>
            </form>
            <p className="footnote" aria-label="Versão do Chat">
              v{__APP_VERSION__}
            </p>
            {notice && (
              <p className="status" role="status">
                {notice}
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

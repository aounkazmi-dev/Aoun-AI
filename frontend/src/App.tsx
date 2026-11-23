import { Avatar, Markdown, CopyButton } from "./components/ui";
import { Companion } from "./components/Companion";
import { Welcome, Projects, About } from "./components/PortfolioPages";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ArrowUpRight,
  Plus,
  MessageSquare,
  FolderCode,
  Github,
  Linkedin,
  Mail,
  PanelLeftClose,
  Menu,
  X,
  RotateCcw,
  Square,
  Download,
  Trash2,
  Pencil,
  BookOpen,
  ChevronRight,
  Search,
  Sun,
  Moon,
} from "lucide-react";
import type { Conversation, Message, Source } from "./types";
import { loadConversations, saveConversations } from "./storage";
import { sendChat } from "./chat";
import { apiUrl } from "./api";

const id = () => crypto.randomUUID();
const safeUrl = (url: string) => (/^https:\/\//i.test(url) ? url : undefined);

export default function App() {
  const [conversations, setConversations] =
    useState<Conversation[]>(loadConversations);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [view, setView] = useState<"chat" | "projects" | "about">("chat");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState(false);
  const [sidebar, setSidebar] = useState(false);
  const [search, setSearch] = useState("");
  const [sourceMessage, setSourceMessage] = useState<Message | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [health, setHealth] = useState<{ mode: string; ready: boolean } | null>(
    null,
  );
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem("aounos.theme") === "dark";
    } catch {
      return false;
    }
  });
  const abort = useRef<AbortController | null>(null);
  const pending = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);
  const followStream = useRef(true);
  const [mobile, setMobile] = useState(() => window.innerWidth <= 700);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const current = conversations.find((c) => c.id === currentId);
  const messages = current?.messages || [];

  useEffect(() => {
    const query = window.matchMedia("(max-width: 700px)");
    const update = () => setMobile(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let alive = true;
    const check = () =>
      fetch(apiUrl("/api/health"))
        .then((r) => {
          if (!r.ok) throw new Error();
          return r.json();
        })
        .then((data) => {
          if (alive) setHealth(data);
        })
        .catch(() => {
          if (alive) setHealth(null);
        });
    void check();
    const timer = setInterval(check, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    try {
      localStorage.setItem("aounos.theme", dark ? "dark" : "light");
    } catch {
      /* Theme still works without storage. */
    }
  }, [dark]);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        saveConversations(conversations);
        setStorageError(false);
      } catch {
        setStorageError(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [conversations]);
  useEffect(() => {
    if (followStream.current)
      bottom.current?.scrollIntoView({ behavior: "instant", block: "end" });
  }, [messages.length, messages.at(-1)?.content]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSidebar(false);
        setSourceMessage(null);
        setDeleteId(null);
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  useEffect(() => {
    const dialog = document.querySelector<HTMLElement>(
      '[role="dialog"], [role="alertdialog"]',
    );
    if (!dialog) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = [
        ...dialog.querySelectorAll<HTMLElement>(
          'button, a[href], summary, input, [tabindex="0"]',
        ),
      ].filter(
        (el) => el.getClientRects().length && !el.hasAttribute("disabled"),
      );
      const first = focusable[0],
        last = focusable.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      previousFocus?.focus();
    };
  }, [sourceMessage, deleteId]);

  function newChat() {
    if (busy) return;
    setCurrentId(null);
    setInput("");
    setError("");
    setView("chat");
    setSidebar(false);
    textarea.current?.focus();
  }
  function updateMessage(
    conversationId: string,
    messageId: string,
    update: Partial<Message> | ((m: Message) => Partial<Message>),
  ) {
    setConversations((items) =>
      items.map((c) =>
        c.id !== conversationId
          ? c
          : {
              ...c,
              updatedAt: Date.now(),
              messages: c.messages.map((m) =>
                m.id !== messageId
                  ? m
                  : {
                      ...m,
                      ...(typeof update === "function" ? update(m) : update),
                    },
              ),
            },
      ),
    );
  }
  async function send(text: string, retry = false) {
    if (!text.trim() || pending.current || text.trim().length > 500) return;
    pending.current = true;
    followStream.current = true;
    setBusy(true);
    setError("");
    setInput("");
    setView("chat");
    const conversationId = currentId || id();
    let previous = current?.messages || [];
    if (retry) {
      const reversedIndex = [...previous]
        .reverse()
        .findIndex((m) => m.role === "user");
      previous = previous.slice(0, previous.length - 1 - reversedIndex);
    }
    const user: Message = {
      id: id(),
      role: "user",
      content: text.trim(),
      status: "complete",
    };
    const answer: Message = {
      id: id(),
      role: "assistant",
      content: "",
      sources: [],
    };
    setCurrentId(conversationId);
    setConversations((items) => {
      const existing = items.find((c) => c.id === conversationId);
      const next = {
        id: conversationId,
        title: existing?.title || text.trim().slice(0, 46),
        messages: [...previous, user, answer],
        updatedAt: Date.now(),
      };
      return [next, ...items.filter((c) => c.id !== conversationId)].slice(
        0,
        30,
      );
    });
    const controller = new AbortController();
    abort.current = controller;
    try {
      await sendChat(
        {
          message: text.trim(),
          history: previous
            .filter((m) => m.status === "complete")
            .slice(-6)
            .map((m) => ({ role: m.role, content: m.content.slice(0, 1500) })),
        },
        controller.signal,
        ({ event, data }) => {
          if (event === "sources")
            updateMessage(conversationId, answer.id, {
              sources: data.sources as Source[],
              mode: String(data.mode),
            });
          if (event === "token")
            updateMessage(conversationId, answer.id, (m) => ({
              content: m.content + String(data.text),
            }));
          if (event === "done")
            updateMessage(conversationId, answer.id, { status: "complete" });
        },
        setConnecting,
      );
    } catch (e) {
      const stopped = controller.signal.aborted;
      updateMessage(conversationId, answer.id, {
        status: stopped ? "stopped" : "error",
      });
      if (!stopped)
        setError(
          e instanceof Error
            ? e.message
            : "Something went wrong. Please retry.",
        );
    } finally {
      pending.current = false;
      setBusy(false);
      abort.current = null;
      textarea.current?.focus();
    }
  }
  function exportChat() {
    if (!current) return;
    const text =
      "# " +
      current.title +
      "\n\n" +
      messages
        .map(
          (m) =>
            `## ${m.role === "user" ? "You" : "AounOS"}${m.mode === "demo" ? " (offline preview)" : ""}\n\n${m.content}\n\n${m.sources?.map((s) => `[${s.id}] ${s.title}: ${s.section}`).join("\n") || ""}`,
        )
        .join("\n\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/markdown" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "aounos-conversation.md";
    link.click();
    URL.revokeObjectURL(url);
  }
  const lastQuestion = [...messages]
    .reverse()
    .find((m) => m.role === "user")?.content;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {sidebar && (
        <button
          className="scrim"
          aria-label="Close navigation"
          onClick={() => setSidebar(false)}
        />
      )}
      <aside
        className={`sidebar ${sidebar ? "open" : ""}`}
        aria-label="Main navigation"
        inert={mobile && !sidebar}
        aria-hidden={mobile && !sidebar}
      >
        <div className="brand">
          <span className="brand-mark">
            a<span>o</span>
          </span>
          <span>
            Aoun<span className="brand-os">OS</span>
            <small>PERSONAL INTELLIGENCE</small>
          </span>
          <button
            className="icon-button close-nav"
            aria-label="Close navigation"
            onClick={() => setSidebar(false)}
          >
            <PanelLeftClose size={17} />
          </button>
        </div>
        <button className="new-chat" onClick={newChat} disabled={busy}>
          <Plus size={17} /> New conversation <span>↗</span>
        </button>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {[
            { key: "chat", label: "Ask AounOS", icon: MessageSquare },
            { key: "projects", label: "Selected projects", icon: FolderCode },
            { key: "about", label: "About Aoun", icon: BookOpen },
          ].map((item) => (
            <button
              key={item.key}
              className={`nav-item ${view === item.key ? "selected" : ""}`}
              onClick={() => {
                setView(item.key as typeof view);
                setSidebar(false);
              }}
            >
              <item.icon size={17} />
              {item.label}
              {view === item.key && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="history-heading">
          <div className="nav-label">YOUR CONVERSATIONS</div>
          <span>{conversations.length.toString().padStart(2, "0")}</span>
        </div>
        {conversations.length > 3 && (
          <label className="history-search">
            <Search size={14} />
            <input
              aria-label="Search conversations"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations"
            />
          </label>
        )}
        <div className="history-list">
          {!conversations.length && (
            <div className="history-empty">
              <MessageSquare size={19} />
              <p>A little curiosity goes a long way.</p>
              <span>Your conversations will live here.</span>
            </div>
          )}
          {conversations
            .filter((c) => c.title.toLowerCase().includes(search.toLowerCase()))
            .map((c) => (
              <div
                key={c.id}
                className={`history-item ${c.id === currentId ? "active" : ""}`}
              >
                {renaming === c.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setConversations((items) =>
                        items.map((item) =>
                          item.id === c.id
                            ? {
                                ...item,
                                title:
                                  renameValue.trim().slice(0, 80) || item.title,
                              }
                            : item,
                        ),
                      );
                      setRenaming(null);
                    }}
                  >
                    <input
                      autoFocus
                      aria-label="Conversation title"
                      maxLength={80}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => setRenaming(null)}
                    />
                  </form>
                ) : (
                  <button
                    className="history-title"
                    disabled={busy}
                    onClick={() => {
                      setCurrentId(c.id);
                      setView("chat");
                      setError("");
                      setSidebar(false);
                    }}
                  >
                    <MessageSquare size={13} />
                    <span>{c.title}</span>
                  </button>
                )}
                <div className="history-actions">
                  <button
                    aria-label={`Rename ${c.title}`}
                    disabled={busy}
                    onClick={() => {
                      setRenaming(c.id);
                      setRenameValue(c.title);
                    }}
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    aria-label={`Delete ${c.title}`}
                    disabled={busy}
                    onClick={() => setDeleteId(c.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
        </div>
        <div className="sidebar-bottom">
          <a
            className="availability resume-download"
            href="/Aoun_Abbas_Resume.pdf"
            download="Aoun_Abbas_Resume.pdf"
          >
            <span>Download Aoun’s resume</span>
            <Download size={15} />
          </a>
          <a
            className="profile-link"
            href="https://github.com/aounkazmi-dev"
            target="_blank"
            rel="noreferrer"
          >
            <Avatar small />
            <span>
              <strong>Aoun Abbas</strong>
              <small>CS student. AI builder.</small>
            </span>
            <ArrowUpRight size={16} />
          </a>
          <div className="socials">
            <a
              href="https://github.com/aounkazmi-dev"
              aria-label="GitHub"
              target="_blank"
              rel="noreferrer"
            >
              <Github size={17} />
            </a>
            <a
              href="https://linkedin.com/in/aoun-abbas-dev"
              aria-label="LinkedIn"
              target="_blank"
              rel="noreferrer"
            >
              <Linkedin size={17} />
            </a>
            <a href="mailto:aoun.abbas.dev@gmail.com" aria-label="Email Aoun">
              <Mail size={17} />
            </a>
            <span>BUILT WITH CURIOSITY</span>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setSidebar(true)}
            >
              <Menu size={20} />
            </button>
            <span className="tiny-logo">✳</span>
            <span>My digital corner</span>
            <ChevronRight size={13} />
            <strong>
              {view === "chat"
                ? "A conversation away"
                : view === "projects"
                  ? "Selected work"
                  : "The person behind it"}
            </strong>
          </div>
          <div className="top-actions">
            <span className={`mode-pill ${health?.ready ? "" : "unavailable"}`}>
              <span className="status-dot" />
              {health?.mode === "demo"
                ? "Offline preview"
                : health?.ready
                  ? "AI assistant"
                  : "Connecting to assistant"}
            </span>
            <button
              className="icon-button"
              aria-label={dark ? "Use light theme" : "Use dark theme"}
              onClick={() => setDark(!dark)}
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </header>
        <main
          id="main"
          className={`main ${view === "chat" ? "chat-main" : ""}`}
        >
          {view === "chat" && (
            <>
              <div
                className={`chat-scroll ${messages.length ? "has-messages" : ""}`}
                onScroll={(e) => {
                  const el = e.currentTarget;
                  followStream.current =
                    el.scrollHeight - el.scrollTop - el.clientHeight < 100;
                }}
              >
                {!messages.length ? (
                  <Welcome busy={busy} onAsk={(text) => void send(text)} />
                ) : (
                  <section className="messages" aria-label="Conversation">
                    <div className="conversation-heading">
                      <span>YOUR CONVERSATION</span>
                      <button className="text-button" onClick={exportChat}>
                        <Download size={14} />
                        Export
                      </button>
                    </div>
                    {messages.map((message, index) => (
                      <article
                        key={message.id}
                        className={`message ${message.role}`}
                      >
                        <div className="message-avatar">
                          {message.role === "assistant" ? (
                            <Avatar
                              small
                              active={busy && index === messages.length - 1}
                            />
                          ) : (
                            <span>Y</span>
                          )}
                        </div>
                        <div className="message-body">
                          <div className="message-name">
                            {message.role === "assistant" ? "AounOS" : "You"}
                            {message.role === "assistant" && (
                              <span>
                                {message.mode === "demo"
                                  ? "OFFLINE LOOKUP"
                                  : "PORTFOLIO ASSISTANT"}
                              </span>
                            )}
                          </div>
                          <div className="markdown">
                            {message.content ? (
                              <Markdown text={message.content} />
                            ) : busy && index === messages.length - 1 ? (
                              <div
                                className="typing"
                                role="status"
                                aria-label={
                                  connecting
                                    ? "Connecting to assistant"
                                    : "Looking through the knowledge base"
                                }
                              >
                                <i />
                                <i />
                                <i />
                                <span>
                                  {connecting
                                    ? "Connecting to assistant… First visits can take a minute."
                                    : "Looking through my notes…"}
                                </span>
                              </div>
                            ) : (
                              <p className="muted">No answer received.</p>
                            )}
                          </div>
                          {message.role === "assistant" && (
                            <>
                              <div className="answer-actions">
                                {!!message.sources?.length && (
                                  <button
                                    className="source-button"
                                    onClick={() => setSourceMessage(message)}
                                  >
                                    <BookOpen size={13} />
                                    {message.sources.length} reference sources{" "}
                                    <ChevronRight size={12} />
                                  </button>
                                )}
                                {message.content && (
                                  <CopyButton text={message.content} />
                                )}
                                {!busy && index === messages.length - 1 && (
                                  <button
                                    className="text-button"
                                    onClick={() =>
                                      lastQuestion &&
                                      void send(lastQuestion, true)
                                    }
                                  >
                                    <RotateCcw size={13} />
                                    Retry
                                  </button>
                                )}
                              </div>
                              {message.status === "stopped" && (
                                <div className="interrupted">
                                  Response stopped · This answer may be
                                  incomplete.
                                </div>
                              )}
                              {message.status === "error" && (
                                <div className="interrupted">
                                  Response interrupted · Please retry.
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </article>
                    ))}
                    <div ref={bottom} />
                  </section>
                )}
              </div>
              <div className="composer-wrap">
                {error && (
                  <div className="error-banner" role="alert">
                    <span>{error}</span>
                    <button
                      aria-label="Dismiss error"
                      onClick={() => setError("")}
                    >
                      <X size={15} />
                    </button>
                  </div>
                )}
                {storageError && (
                  <div role="status" className="error-banner">
                    Browser storage is full or unavailable. This conversation
                    may not be saved.
                  </div>
                )}
                <form
                  className="composer"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send(input);
                  }}
                >
                  <textarea
                    ref={textarea}
                    aria-label="Message AounOS"
                    placeholder="Ask about my projects, skills, or what’s next…"
                    value={input}
                    maxLength={500}
                    rows={2}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        !e.nativeEvent.isComposing
                      ) {
                        e.preventDefault();
                        void send(input);
                      }
                    }}
                  />
                  <div className="composer-bottom">
                    <span>
                      <span className="mini-star">✳</span>A little more personal
                      than a résumé.
                    </span>
                    <div>
                      {input.length > 400 && <small>{input.length}/500</small>}
                      {busy ? (
                        <button
                          type="button"
                          className="send-button"
                          aria-label="Stop response"
                          onClick={() => abort.current?.abort()}
                        >
                          <Square size={14} fill="currentColor" />
                        </button>
                      ) : (
                        <button
                          className="send-button"
                          type="submit"
                          aria-label="Send message"
                          disabled={!input.trim()}
                        >
                          <ArrowUp size={19} />
                        </button>
                      )}
                    </div>
                  </div>
                </form>
                <div className="composer-footer">
                  <span>
                    {health?.mode === "demo"
                      ? "Offline preview · Document excerpts, no AI generation"
                      : "AI can make mistakes. Explore the sources."}
                  </span>
                  <span>
                    Conversations stay in this browser{" "}
                    <span className="footer-dot">·</span>{" "}
                    <span className="enter-hint">↵ to send</span>
                  </span>
                </div>
              </div>
            </>
          )}
          {view === "projects" && (
            <Projects busy={busy} onAsk={(text) => void send(text)} />
          )}
          {view === "about" && <About />}
        </main>
      </div>
      {sourceMessage && (
        <div className="drawer-backdrop" onClick={() => setSourceMessage(null)}>
          <aside
            className="source-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Reference sources"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-header">
              <div>
                <small>BEHIND THE ANSWER</small>
                <h2>Reference sources</h2>
              </div>
              <button
                className="icon-button"
                autoFocus
                aria-label="Close sources"
                onClick={() => setSourceMessage(null)}
              >
                <X size={20} />
              </button>
            </div>
            <p>
              These passages were available to the assistant. A source being
              retrieved does not guarantee every claim in an answer is
              supported.
            </p>
            {sourceMessage.sources?.map((source) => (
              <details key={source.id} className="source-detail">
                <summary>
                  <span className="source-id">{source.id}</span>
                  <div>
                    <strong>{source.title}</strong>
                    <small>{source.section}</small>
                  </div>
                  <ChevronRight size={14} />
                </summary>
                <div className="source-excerpt">
                  <Markdown text={source.excerpt} />
                  {safeUrl(source.url) && (
                    <a
                      href={safeUrl(source.url)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View project / profile <ArrowUpRight size={13} />
                    </a>
                  )}
                </div>
              </details>
            ))}
          </aside>
        </div>
      )}
      {!sourceMessage && !deleteId && !sidebar && <Companion busy={busy} />}
      {deleteId && (
        <div className="modal-backdrop">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            className="confirm-dialog"
          >
            <Trash2 size={22} />
            <h2 id="delete-title">Delete this conversation?</h2>
            <p>This removes it from this browser. It can’t be undone.</p>
            <div>
              <button autoFocus onClick={() => setDeleteId(null)}>
                Keep conversation
              </button>
              <button
                className="danger"
                onClick={() => {
                  setConversations((items) =>
                    items.filter((c) => c.id !== deleteId),
                  );
                  if (currentId === deleteId) setCurrentId(null);
                  setDeleteId(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

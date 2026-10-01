import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "./providers/AuthProvider";
import { useChat } from "../features/chat/hooks/useChat";
import {
  getConversationMessages,
  listConversations,
  type Conversation,
} from "../features/conversations/api/conversations.api";

type Mode =
  | "Explain"
  | "Debug"
  | "Architect"
  | "Review"
  | "Implement"
  | "Test"
  | "Security"
  | "DevOps";

const modes: Mode[] = [
  "Explain",
  "Debug",
  "Architect",
  "Review",
  "Implement",
  "Test",
  "Security",
  "DevOps",
];

const starterCards: Array<{
  icon: string;
  title: string;
  mode: Mode;
}> = [
  { icon: "⌁", title: "Debug this React error", mode: "Debug" },
  { icon: "◇", title: "Design a scalable REST API", mode: "Architect" },
  { icon: "⌕", title: "Review this function", mode: "Review" },
  { icon: "▱", title: "Explain this system design", mode: "Explain" },
  { icon: "⚗", title: "Write unit tests", mode: "Implement" },
  { icon: "⑂", title: "Plan a CI/CD pipeline", mode: "Architect" },
];

const visibleModes: Mode[] = [
  "Explain",
  "Debug",
  "Architect",
  "Review",
  "Implement",
];

function createConversationTitle(message: string) {
  const cleaned = message
    .replace(/\s+/g, " ")
    .replace(/[`*_#]/g, "")
    .trim();

  if (!cleaned) return "New conversation";

  const words = cleaned.split(" ");
  return words.length <= 7
    ? cleaned
    : words.slice(0, 7).join(" ") + "…";
}

function modeLabel(mode: Mode) {
  return mode.toUpperCase() + " MODE";
}

function App() {
  const { user, signOut } = useAuth();
  const {
    messages,
    isStreaming,
    sendMessage,
    replaceMessages,
    clearMessages,
  } = useChat();

  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<Mode>("Explain");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] =
    useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showAllModes, setShowAllModes] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [autoHideSidebar, setAutoHideSidebar] = useState(() => localStorage.getItem("forgeai-sidebar-autohide") === "true");
  const sidebarTimerRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    localStorage.setItem("forgeai-sidebar-autohide", String(autoHideSidebar));
  }, [autoHideSidebar]);

  useEffect(() => {
    if (!autoHideSidebar || sidebarHidden) return;
    sidebarTimerRef.current = window.setTimeout(() => setSidebarHidden(true), 5000);
    return () => {
      if (sidebarTimerRef.current) window.clearTimeout(sidebarTimerRef.current);
    };
  }, [autoHideSidebar, sidebarHidden]);

  const revealSidebar = () => {
    if (sidebarTimerRef.current) window.clearTimeout(sidebarTimerRef.current);
    setSidebarHidden(false);
  };

  const hideSidebar = () => {
    if (sidebarTimerRef.current) window.clearTimeout(sidebarTimerRef.current);
    setSidebarHidden(true);
  };

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        setLoadingHistory(true);
        const items = await listConversations();
        if (!cancelled) setConversations(items);
      } catch (error) {
        if (!cancelled) {
          setHistoryError(
            error instanceof Error
              ? error.message
              : "Could not load chat history.",
          );
        }
      } finally {
        if (!cancelled) setLoadingHistory(false);
      }
    }

    void loadHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectConversation = async (
    conversation: Conversation,
  ) => {
    if (isStreaming || activeConversationId === conversation.id) return;

    try {
      setHistoryError(null);
      const storedMessages = await getConversationMessages(conversation.id);

      replaceMessages(
        storedMessages.map((item) => ({
          role: item.role,
          content: item.content,
        })),
      );

      setActiveConversationId(conversation.id);

      const matchingMode = modes.find(
        (item) =>
          item.toLowerCase() === conversation.mode.toLowerCase(),
      );
      if (matchingMode) setMode(matchingMode);
    } catch (error) {
      setHistoryError(
        error instanceof Error
          ? error.message
          : "Could not load this conversation.",
      );
    }
  };

  const handleMessageChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const textarea = event.target;
    setMessage(textarea.value);
    textarea.style.height = "auto";
    textarea.style.height =
      Math.min(textarea.scrollHeight, 220) + "px";
  };

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isStreaming) return;

    setMessage("");
    if (textareaRef.current) textareaRef.current.style.height = "76px";

    const title = createConversationTitle(trimmedMessage);

    await sendMessage(
      trimmedMessage,
      mode.toLowerCase(),
      activeConversationId,
      (conversation) => {
        setActiveConversationId(conversation.id);
        setConversations((current) => {
          const exists = current.some((item) => item.id === conversation.id);
          if (exists) {
            return current.map((item) =>
              item.id === conversation.id
                ? {
                    ...item,
                    title: conversation.title,
                    updated_at: conversation.updated_at,
                  }
                : item,
            );
          }
          return [conversation, ...current];
        });
      },
      (conversationId) => {
        if (!conversationId) return;
        setActiveConversationId(conversationId);
        setConversations((current) =>
          current
            .map((item) =>
              item.id === conversationId
                ? {
                    ...item,
                    title:
                      item.title === "New conversation"
                        ? title
                        : item.title,
                    updated_at: new Date().toISOString(),
                  }
                : item,
            )
            .sort(
              (a, b) =>
                new Date(b.updated_at).getTime() -
                new Date(a.updated_at).getTime(),
            ),
        );
      },
    );
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleNewChat = () => {
    if (isStreaming) return;
    clearMessages();
    setActiveConversationId(null);
    setHistoryError(null);
    setShowSettings(false);
    setMessage("");
  };

  const filteredConversations = [...conversations]
    .filter((conversation) =>
      conversation.title
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
    )
    .sort(
      (a, b) =>
        new Date(b.updated_at).getTime() -
        new Date(a.updated_at).getTime(),
    );

  const handleStarter = (card: (typeof starterCards)[number]) => {
    setMode(card.mode);
    setMessage(card.title + ": ");
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return (
    <div className="app-shell">
      <aside
        className={sidebarHidden ? "sidebar sidebar-hidden" : "sidebar"}
        onMouseEnter={revealSidebar}
      >
        <div className="sidebar-top">
          <div className="brand-lockup">
            <div className="brand-mark">
              <img src="/logo.svg" alt="" />
            </div>
            <div className="brand-copy">
              <div className="brand-name">ForgeAI</div>
              <div className="brand-kicker">ENGINEERING COPILOT</div>
            </div>
          </div>

          <button
            className="new-chat-button"
            onClick={handleNewChat}
            disabled={isStreaming}
          >
            <span>＋</span>
            <strong>New chat</strong>
          </button>

          <label className="chat-search">
            <span className="search-icon">⌕</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search chats"
              aria-label="Search chats"
            />
            <span className="search-shortcut">⌘K</span>
          </label>

          <div className="history">
            {loadingHistory ? (
              <div className="history-empty">Loading chats…</div>
            ) : filteredConversations.length === 0 ? (
              <div className="history-empty">
                {search
                  ? "No matching chats."
                  : "No chats yet. Start one above."}
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  className={
                    activeConversationId === conversation.id
                      ? "history-item active"
                      : "history-item"
                  }
                  onClick={() =>
                    void handleSelectConversation(conversation)
                  }
                  disabled={isStreaming}
                >
                  <span className="history-dot">•</span>
                  <span>{conversation.title}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="sidebar-account">
          <div className="account-avatar">
            {(user?.email?.[0] ?? "A").toUpperCase()}
          </div>
          <div className="account-details">
            <span className="account-email">
              {user?.email ?? "Signed in"}
            </span>
            <span className="account-label">Personal workspace</span>
          </div>
          <button
            className="account-action"
            title="Sign out"
            onClick={() => void signOut()}
          >
            ↪
          </button>
        </div>
      </aside>

      <main className="workspace">
        <header className="workspace-header">
          <div className="workspace-title">
            <span className="workspace-title-mark">/</span>
            <strong>
              {messages.length > 0
                ? conversations.find(
                    (item) => item.id === activeConversationId,
                  )?.title ?? "New chat"
                : "New chat"}
            </strong>
          </div>

          <div className="header-actions">
            <span className="demo-pill">
              <span>●</span>
              Demo mode
            </span>
            <button
              className="header-icon-button"
              title="New chat"
              onClick={handleNewChat}
            >
              ＋
            </button>
            <button
              className="header-icon-button sidebar-toggle-button"
              title={sidebarHidden ? "Show sidebar" : "Hide sidebar"}
              onClick={sidebarHidden ? revealSidebar : hideSidebar}
            >
              {sidebarHidden ? "☰" : "‹"}
            </button>
            <button
              className="header-icon-button"
              title="Settings"
              onClick={() => setShowSettings((value) => !value)}
            >
              ⚙
            </button>
          </div>
        </header>

        {sidebarHidden && (
          <button className="sidebar-show-button" onClick={revealSidebar} title="Show sidebar">
            Show sidebar
          </button>
        )}

        {showSettings ? (
          <section className="settings-panel">
            <div className="settings-heading">
              <span>FORGEAI</span>
              <h1>Settings</h1>
              <p>Configure the workspace without leaving your chat.</p>
            </div>
            <div className="settings-grid">
              <div className="settings-card">
                <span className="settings-card-label">ACCOUNT</span>
                <strong>{user?.email ?? "Signed in"}</strong>
                <p>Your ForgeAI account and chat history.</p>
              </div>
              <div className="settings-card">
                <span className="settings-card-label">AI PROVIDER</span>
                <strong>Groq</strong>
                <p>Server-side provider connection.</p>
                <span className="connected-badge">Connected</span>
              </div>
              <div className="settings-card">
                <span className="settings-card-label">DEFAULT MODE</span>
                <strong>{mode}</strong>
                <p>Used when you start a fresh chat.</p>
              </div>
            </div>
            <button className="settings-signout" onClick={() => void signOut()}>
              Sign out
            </button>
          </section>
        ) : messages.length === 0 ? (
          <section className="welcome-workspace">
            <div className="grid-overlay" />

            <div className="welcome-content">
              <div className="welcome-eyebrow">
                <span className="eyebrow-line" />
                SOFTWARE ENGINEERING AI
              </div>

              <h1 className="welcome-title">
                <span>Engineering</span>{" "}
                <span>answers,</span>{" "}
                <span>not small talk.</span>
              </h1>

              <p className="welcome-description">
                ForgeAI is tuned for software work: debugging,
                architecture and system design, DevOps, databases,
                APIs, testing, security and code review. Pick a
                starting point or just describe what you’re building.
              </p>

              <div className="starter-grid">
                {starterCards.map((card) => (
                  <button
                    className="starter-card"
                    key={card.title}
                    onClick={() => handleStarter(card)}
                  >
                    <span className="starter-icon">{card.icon}</span>
                    <span className="starter-copy">
                      <strong>{card.title}</strong>
                      <small>{modeLabel(card.mode)}</small>
                    </span>
                    <span className="starter-arrow">↗</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <section className="messages">
            {messages.map((item, index) => {
              const isUser = item.role === "user";
              const isLastMessage = index === messages.length - 1;

              return (
                <div
                  key={item.role + "-" + index}
                  className={
                    isUser
                      ? "message-row message-row-user"
                      : "message-row message-row-assistant"
                  }
                >
                  <div className="message-meta">
                    <span className={isUser ? "role-chip user" : "role-chip"}>
                      {isUser ? "YOU" : "FORGEAI"}
                    </span>
                  </div>
                  <div
                    className={
                      isUser
                        ? "message-content user-content"
                        : "message-content"
                    }
                  >
                    {item.content ||
                      (isStreaming && isLastMessage ? (
                        <span className="thinking">
                          ForgeAI is thinking…
                        </span>
                      ) : null)}
                  </div>
                </div>
              );
            })}
            {historyError && <div className="history-error">{historyError}</div>}
          </section>
        )}

        {!showSettings && (
          <section className="composer-area">
            <div className="composer-mode-row">
              <div className="mode-segment">
                {visibleModes.map((item) => (
                  <button
                    key={item}
                    className={mode === item ? "mode-pill selected" : "mode-pill"}
                    onClick={() => setMode(item)}
                    disabled={isStreaming}
                  >
                    {item}
                  </button>
                ))}
                <button
                  className="mode-more"
                  onClick={() => setShowAllModes((value) => !value)}
                  disabled={isStreaming}
                  title="More engineering modes"
                >
                  ···
                </button>
                {showAllModes && (
                  <div className="mode-popover">
                    {modes.map((item) => (
                      <button
                        key={item}
                        className={mode === item ? "mode-popover-item active" : "mode-popover-item"}
                        onClick={() => {
                          setMode(item);
                          setShowAllModes(false);
                        }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <span className="keyboard-hint">
                Enter to send · Shift+Enter for newline
              </span>
            </div>

            <div className="composer">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleMessageChange}
                onKeyDown={handleKeyDown}
                placeholder="Describe the bug, paste the code, or ask for a design..."
                rows={3}
                disabled={isStreaming}
              />
              <div className="composer-bottom">
                <span className="composer-context">
                  {mode} mode · Groq
                </span>
                <button
                  className="send-button"
                  disabled={!message.trim() || isStreaming}
                  onClick={() => void handleSend()}
                >
                  {isStreaming ? "Thinking…" : "Send"} <span>↑</span>
                </button>
              </div>
            </div>

            <p className="composer-disclaimer">
              ForgeAI can make mistakes. Verify important technical decisions.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;

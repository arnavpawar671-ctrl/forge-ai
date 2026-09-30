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
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      try {
        setLoadingHistory(true);
        const items = await listConversations();

        if (!cancelled) {
          setConversations(items);
        }
      } catch (error) {
        if (!cancelled) {
          setHistoryError(
            error instanceof Error
              ? error.message
              : "Could not load chat history.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingHistory(false);
        }
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
    if (isStreaming || activeConversationId === conversation.id) {
      return;
    }

    try {
      setHistoryError(null);
      const storedMessages = await getConversationMessages(
        conversation.id,
      );

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

      if (matchingMode) {
        setMode(matchingMode);
      }
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
      Math.min(textarea.scrollHeight, 240) + "px";
  };

  const handleSend = async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || isStreaming) {
      return;
    }

    setMessage("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "52px";
    }

    const title = createConversationTitle(trimmedMessage);

    await sendMessage(
      trimmedMessage,
      mode.toLowerCase(),
      activeConversationId,
      (conversation) => {
        setActiveConversationId(conversation.id);

        setConversations((current) => {
          const exists = current.some(
            (item) => item.id === conversation.id,
          );

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
        if (!conversationId) {
          return;
        }

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

  const sortedConversations = [...conversations].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() -
      new Date(a.updated_at).getTime(),
  );

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img
            src="/logo.svg"
            alt="ForgeAI"
            className="brand-logo"
          />
          <div className="brand-text">
            <h1>ForgeAI</h1>
            <p>AI Software Engineer</p>
          </div>
        </div>

        <div className="connection-status">
          <span className="connection-dot" />
          <span>
            {user?.email ?? "Signed in"}
          </span>
        </div>
      </header>

      <div className="workspace">
        <aside className="sidebar">
          <button
            className="new-chat-button"
            onClick={handleNewChat}
            disabled={isStreaming}
          >
            <span className="new-chat-icon">＋</span>
            <span>New Chat</span>
          </button>

          <div className="sidebar-heading">
            CHAT HISTORY
          </div>

          <div className="conversation-list">
            {loadingHistory ? (
              <div className="empty-history">
                Loading conversations…
              </div>
            ) : sortedConversations.length === 0 ? (
              <div className="empty-history">
                No conversations yet.
              </div>
            ) : (
              sortedConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  className={
                    activeConversationId === conversation.id
                      ? "conversation-button active"
                      : "conversation-button"
                  }
                  onClick={() =>
                    void handleSelectConversation(conversation)
                  }
                  disabled={isStreaming}
                >
                  <span className="conversation-icon">◇</span>
                  <span className="conversation-title">
                    {conversation.title}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="sidebar-bottom">
            <button
              className="sidebar-action"
              onClick={() =>
                setShowSettings((current) => !current)
              }
            >
              <span>⚙</span>
              <span>Settings</span>
            </button>
          </div>
        </aside>

        <main className="chat-area">
          {showSettings ? (
            <section className="settings-panel">
              <div className="settings-header">
                <div>
                  <p className="settings-eyebrow">
                    FORGEAI
                  </p>
                  <h2>Settings</h2>
                </div>

                <button
                  className="settings-close"
                  onClick={() => setShowSettings(false)}
                >
                  ×
                </button>
              </div>

              <div className="settings-card">
                <div>
                  <strong>Account</strong>
                  <p>{user?.email ?? "Signed in"}</p>
                </div>
              </div>

              <div className="settings-card">
                <div>
                  <strong>AI Provider</strong>
                  <p>Groq</p>
                </div>
                <span className="settings-status">
                  Connected
                </span>
              </div>

              <div className="settings-card">
                <div>
                  <strong>Chat History</strong>
                  <p>
                    Stored securely in your ForgeAI account.
                  </p>
                </div>
              </div>

              <button
                className="sidebar-action"
                onClick={() => void signOut()}
              >
                <span>↪</span>
                <span>Sign out</span>
              </button>
            </section>
          ) : messages.length === 0 ? (
            <section className="welcome">
              <img
                src="/logo.svg"
                alt=""
                className="welcome-logo"
              />

              <div className="mode-badge">
                {mode} Mode
              </div>

              <h2>Build something powerful.</h2>

              <p>
                ForgeAI is your AI software engineer for
                coding, debugging, architecture, testing,
                security and DevOps.
              </p>
            </section>
          ) : (
            <section className="messages">
              {messages.map((item, index) => {
                const isUser = item.role === "user";
                const isLastMessage =
                  index === messages.length - 1;

                return (
                  <div
                    key={item.role + "-" + index}
                    className={
                      "message-row " +
                      (isUser
                        ? "message-row-user"
                        : "message-row-assistant")
                    }
                  >
                    <div
                      className={
                        "message-wrapper " +
                        (isUser
                          ? "message-wrapper-user"
                          : "message-wrapper-assistant")
                      }
                    >
                      <div
                        className={
                          "message-role " +
                          (isUser
                            ? "message-role-user"
                            : "message-role-assistant")
                        }
                      >
                        {isUser ? "You" : "ForgeAI"}
                      </div>

                      <div
                        className={
                          "message-bubble " +
                          (isUser
                            ? "message-bubble-user"
                            : "message-bubble-assistant")
                        }
                      >
                        {item.content ||
                          (isStreaming &&
                          isLastMessage ? (
                            <span className="thinking">
                              Thinking...
                            </span>
                          ) : null)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {historyError && (
            <div className="empty-history">
              {historyError}
            </div>
          )}

          {!showSettings && (
            <>
              <section className="composer">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={handleMessageChange}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    "Ask ForgeAI to " +
                    mode.toLowerCase() +
                    "..."
                  }
                  rows={1}
                  disabled={isStreaming}
                />

                <div className="composer-toolbar">
                  <div className="mode-selector">
                    <button
                      className="mode-selector-button"
                      onClick={() =>
                        setShowModeMenu((current) => !current)
                      }
                      disabled={isStreaming}
                    >
                      <span className="mode-selector-icon">
                        {mode === "Explain" && "💡"}
                        {mode === "Debug" && "🐛"}
                        {mode === "Architect" && "🏗️"}
                        {mode === "Review" && "🔍"}
                        {mode === "Implement" && "⚙️"}
                        {mode === "Test" && "🧪"}
                        {mode === "Security" && "🛡️"}
                        {mode === "DevOps" && "🚀"}
                      </span>

                      <span>{mode}</span>
                      <span className="mode-chevron">▾</span>
                    </button>

                    {showModeMenu && (
                      <div className="mode-menu">
                        {modes.map((item) => (
                          <button
                            key={item}
                            className={
                              mode === item
                                ? "mode-menu-item active"
                                : "mode-menu-item"
                            }
                            onClick={() => {
                              setMode(item);
                              setShowModeMenu(false);
                            }}
                          >
                            <span>
                              {item === "Explain" && "💡"}
                              {item === "Debug" && "🐛"}
                              {item === "Architect" && "🏗️"}
                              {item === "Review" && "🔍"}
                              {item === "Implement" && "⚙️"}
                              {item === "Test" && "🧪"}
                              {item === "Security" && "🛡️"}
                              {item === "DevOps" && "🚀"}
                            </span>
                            <span>{item}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="composer-info">
                    <span>Enter to send</span>
                    <span className="separator">•</span>
                    <span>Shift + Enter</span>
                  </div>

                  <button
                    className="send-button"
                    disabled={
                      !message.trim() || isStreaming
                    }
                    onClick={() => void handleSend()}
                  >
                    {isStreaming ? "Thinking..." : "Send"}
                    <span>
                      {isStreaming ? "..." : "↑"}
                    </span>
                  </button>
                </div>
              </section>

              <p className="composer-hint">
                {mode} Mode • Enter to send • Shift + Enter
                for a new line • ForgeAI can make mistakes.
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;

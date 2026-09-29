import React, { useEffect, useRef, useState } from "react";
import { useChat } from "../features/chat/hooks/useChat";

type Mode =
  | "Explain"
  | "Debug"
  | "Architect"
  | "Review"
  | "Implement"
  | "Test"
  | "Security"
  | "DevOps";

interface Conversation {
  id: string;
  title: string;
  createdAt: number;
}

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

  if (!cleaned) {
    return "New conversation";
  }

  const words = cleaned.split(" ");

  if (words.length <= 7) {
    return cleaned;
  }

  return `${words.slice(0, 7).join(" ")}…`;
}

function App() {
  const {
    messages,
    isStreaming,
    sendMessage,
  } = useChat();

  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<Mode>("Explain");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] =
    useState<string | null>(null);

  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(null);

  /*
   * Load saved chat history.
   */
  useEffect(() => {
    const saved = localStorage.getItem(
      "forgeai-conversations",
    );

    if (!saved) {
      return;
    }

    try {
      setConversations(JSON.parse(saved));
    } catch {
      localStorage.removeItem("forgeai-conversations");
    }
  }, []);

  /*
   * Save chat history.
   */
  useEffect(() => {
    localStorage.setItem(
      "forgeai-conversations",
      JSON.stringify(conversations),
    );
  }, [conversations]);

  /*
   * Automatically create/update the conversation title
   * from the first user message.
   */
  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    const firstUserMessage = messages.find(
      (item) => item.role === "user",
    );

    if (!firstUserMessage) {
      return;
    }

    if (!activeConversationId) {
      const id = crypto.randomUUID();

      const conversation: Conversation = {
        id,
        title: createConversationTitle(
          firstUserMessage.content,
        ),
        createdAt: Date.now(),
      };

      setActiveConversationId(id);
      setConversations((current) => [
        conversation,
        ...current,
      ]);

      return;
    }

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === activeConversationId
          ? {
              ...conversation,
              title: createConversationTitle(
                firstUserMessage.content,
              ),
            }
          : conversation,
      ),
    );
  }, [messages, activeConversationId]);

  /*
   * Auto-grow textarea.
   */
  const handleMessageChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const textarea = event.target;

    setMessage(textarea.value);

    textarea.style.height = "auto";

    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      240,
    )}px`;
  };

  /*
   * Send message.
   */
  const handleSend = async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || isStreaming) {
      return;
    }

    setMessage("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "52px";
    }

    await sendMessage(
      trimmedMessage,
      mode.toLowerCase(),
    );
  };

  /*
   * Enter = send
   * Shift + Enter = newline
   */
  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      void handleSend();
    }
  };

  /*
   * Start a completely new conversation.
   */
  const handleNewChat = () => {
    if (isStreaming) {
      return;
    }

    window.location.reload();
  };

  /*
   * Sort newest conversations first.
   */
  const sortedConversations = [
    ...conversations,
  ].sort(
    (a, b) => b.createdAt - a.createdAt,
  );

  return (
    <div className="app">

      {/* =========================================
          TOP BAR
          ========================================= */}

      <header className="topbar">

        <div className="brand">

          <img
            src="/logo.svg"
            alt="ForgeAI"
            className="brand-logo"
          />

          <div className="brand-text">

            <h1>ForgeAI</h1>

            <p>
              AI Software Engineer
            </p>

          </div>

        </div>

        <div className="connection-status">

          <span className="connection-dot" />

          <span>
            Backend connected
          </span>

        </div>

      </header>

      {/* =========================================
          WORKSPACE
          ========================================= */}

      <div className="workspace">

        {/* =======================================
            SIDEBAR
            ======================================= */}

        <aside className="sidebar">

          <button
            className="new-chat-button"
            onClick={handleNewChat}
            disabled={isStreaming}
          >
            <span className="new-chat-icon">
              ＋
            </span>

            <span>
              New Chat
            </span>
          </button>

          {/* CHAT HISTORY */}

          <div className="sidebar-heading">
            CHAT HISTORY
          </div>

          <div className="conversation-list">

            {sortedConversations.length === 0 ? (

              <div className="empty-history">
                No conversations yet.
              </div>

            ) : (

              sortedConversations.map(
                (conversation) => (

                  <button
                    key={conversation.id}
                    className={
                      activeConversationId ===
                      conversation.id
                        ? "conversation-button active"
                        : "conversation-button"
                    }
                    onClick={() => {
                      setActiveConversationId(
                        conversation.id,
                      );
                    }}
                  >

                    <span className="conversation-icon">
                      ◇
                    </span>

                    <span className="conversation-title">
                      {conversation.title}
                    </span>

                  </button>

                ),
              )

            )}

          </div>

          {/* SIDEBAR BOTTOM */}

          <div className="sidebar-bottom">

            <button
              className="sidebar-action"
              onClick={() =>
                setShowSettings(
                  (current) => !current,
                )
              }
            >

              <span>
                ⚙
              </span>

              <span>
                Settings
              </span>

            </button>

          </div>

        </aside>

        {/* =======================================
            MAIN CHAT
            ======================================= */}

        <main className="chat-area">

          {showSettings ? (

            <section className="settings-panel">

              <div className="settings-header">

                <div>
                  <p className="settings-eyebrow">
                    FORGEAI
                  </p>

                  <h2>
                    Settings
                  </h2>
                </div>

                <button
                  className="settings-close"
                  onClick={() =>
                    setShowSettings(false)
                  }
                >
                  ×
                </button>

              </div>

              <div className="settings-card">

                <div>
                  <strong>
                    AI Provider
                  </strong>

                  <p>
                    Groq
                  </p>
                </div>

                <span className="settings-status">
                  Connected
                </span>

              </div>

              <div className="settings-card">

                <div>
                  <strong>
                    Current Mode
                  </strong>

                  <p>
                    {mode}
                  </p>
                </div>

              </div>

              <div className="settings-card">

                <div>
                  <strong>
                    Chat History
                  </strong>

                  <p>
                    Stored locally in this browser.
                  </p>
                </div>

              </div>

            </section>

          ) : messages.length === 0 ? (

            /* =====================================
               WELCOME
               ===================================== */

            <section className="welcome">

              <img
                src="/logo.svg"
                alt=""
                className="welcome-logo"
              />

              <div className="mode-badge">
                {mode} Mode
              </div>

              <h2>
                Build something powerful.
              </h2>

              <p>
                ForgeAI is your AI software
                engineer for coding, debugging,
                architecture, testing, security
                and DevOps.
              </p>

            </section>

          ) : (

            /* =====================================
               MESSAGES
               ===================================== */

            <section className="messages">

              {messages.map(
                (item, index) => {

                  const isUser =
                    item.role === "user";

                  const isLastMessage =
                    index ===
                    messages.length - 1;

                  return (

                    <div
                      key={`${item.role}-${index}`}
                      className={
                        `message-row ${
                          isUser
                            ? "message-row-user"
                            : "message-row-assistant"
                        }`
                      }
                    >

                      <div
                        className={
                          `message-wrapper ${
                            isUser
                              ? "message-wrapper-user"
                              : "message-wrapper-assistant"
                          }`
                        }
                      >

                        <div
                          className={
                            `message-role ${
                              isUser
                                ? "message-role-user"
                                : "message-role-assistant"
                            }`
                          }
                        >
                          {isUser
                            ? "You"
                            : "ForgeAI"}
                        </div>

                        <div
                          className={
                            `message-bubble ${
                              isUser
                                ? "message-bubble-user"
                                : "message-bubble-assistant"
                            }`
                          }
                        >

                          {item.content ? (
                            item.content
                          ) : (
                            isStreaming &&
                            isLastMessage && (
                              <span className="thinking">
                                Thinking...
                              </span>
                            )
                          )}

                        </div>

                      </div>

                    </div>

                  );
                },
              )}

            </section>

          )}

          {/* =====================================
              COMPOSER
              ===================================== */}

          {!showSettings && (
            <>
              <section className="composer">

                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={handleMessageChange}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    `Ask ForgeAI to ${mode.toLowerCase()}...`
                  }
                  rows={1}
                  disabled={isStreaming}
                />

                <div className="composer-toolbar">

                  {/* MODE SELECTOR */}

                  <div className="mode-selector">

                    <button
                      className="mode-selector-button"
                      onClick={() =>
                        setShowModeMenu(
                          (current) =>
                            !current,
                        )
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

                      <span>
                        {mode}
                      </span>

                      <span className="mode-chevron">
                        ▾
                      </span>

                    </button>

                    {showModeMenu && (

                      <div className="mode-menu">

                        {modes.map(
                          (item) => (

                            <button
                              key={item}
                              className={
                                mode === item
                                  ? "mode-menu-item active"
                                  : "mode-menu-item"
                              }
                              onClick={() => {
                                setMode(item);
                                setShowModeMenu(
                                  false,
                                );
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

                              <span>
                                {item}
                              </span>

                            </button>

                          ),
                        )}

                      </div>

                    )}

                  </div>

                  <div className="composer-info">

                    <span>
                      Enter to send
                    </span>

                    <span className="separator">
                      •
                    </span>

                    <span>
                      Shift + Enter
                    </span>

                  </div>

                  <button
                    className="send-button"
                    disabled={
                      !message.trim() ||
                      isStreaming
                    }
                    onClick={() => {
                      void handleSend();
                    }}
                  >

                    {isStreaming
                      ? "Thinking..."
                      : "Send"}

                    <span>
                      {isStreaming
                        ? "..."
                        : "↑"}
                    </span>

                  </button>

                </div>

              </section>

              <p className="composer-hint">

                {mode} Mode • Enter to send •
                Shift + Enter for a new line •
                ForgeAI can make mistakes.

              </p>
            </>
          )}

        </main>

      </div>

    </div>
  );
}

export default App;
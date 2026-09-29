import React, { useState } from "react";
import { useChat } from "../features/chat/hooks/useChat";

function App() {
  const { messages, isStreaming, sendMessage } = useChat();

  const [message, setMessage] = useState("");
  const [mode, setMode] = useState("Explain");

  const modes = [
    "Explain",
    "Debug",
    "Architect",
    "Review",
    "Implement",
    "Test",
    "Security",
    "DevOps",
  ];

  const handleSend = async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || isStreaming) {
      return;
    }

    setMessage("");

    await sendMessage(
      trimmedMessage,
      mode.toLowerCase(),
    );
  };

  const handleMessageChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const textarea = event.target;
    const value = textarea.value;

    setMessage(value);

    // Reset height first so the textarea can shrink
    // when text is deleted.
    textarea.style.height = "auto";

    // Grow with the content, up to 240px.
    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      240,
    )}px`;
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    // Enter = send
    // Shift + Enter = new line
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="app">
      {/* =========================================
          TOP NAVIGATION
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
            <p>AI Software Engineer</p>
          </div>
        </div>

        <div className="connection-status">
          <span className="connection-dot" />
          <span>Backend connected</span>
        </div>
      </header>

      {/* =========================================
          MAIN WORKSPACE
          ========================================= */}

      <div className="workspace">
        {/* =========================================
            SIDEBAR
            ========================================= */}

        <aside className="sidebar">
          <button className="new-chat-button">
            <span>＋</span>
            New conversation
          </button>

          <div className="sidebar-heading">
            ENGINEERING MODES
          </div>

          <nav className="mode-list">
            {modes.map((item) => (
              <button
                key={item}
                className={
                  mode === item
                    ? "mode-button active"
                    : "mode-button"
                }
                onClick={() => setMode(item)}
                disabled={isStreaming}
              >
                <span className="mode-icon">
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
          </nav>

          <div className="sidebar-footer">
            <div>
              <span className="footer-label">MODEL</span>
              <span className="footer-value">Groq</span>
            </div>

            <div>
              <span className="footer-label">MODE</span>
              <span className="footer-value">{mode}</span>
            </div>
          </div>
        </aside>

        {/* =========================================
            CHAT AREA
            ========================================= */}

        <main className="chat-area">
          {/* =========================================
              MESSAGES / WELCOME
              ========================================= */}

          {messages.length === 0 ? (
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
                    key={`${item.role}-${index}`}
                    className={`message-row ${
                      isUser
                        ? "message-row-user"
                        : "message-row-assistant"
                    }`}
                  >
                    <div
                      className={`message-wrapper ${
                        isUser
                          ? "message-wrapper-user"
                          : "message-wrapper-assistant"
                      }`}
                    >
                      <div
                        className={`message-role ${
                          isUser
                            ? "message-role-user"
                            : "message-role-assistant"
                        }`}
                      >
                        {isUser ? "You" : "ForgeAI"}
                      </div>

                      <div
                        className={`message-bubble ${
                          isUser
                            ? "message-bubble-user"
                            : "message-bubble-assistant"
                        }`}
                      >
                        {item.content ? (
                          item.content
                        ) : isStreaming && isLastMessage ? (
                          <span className="thinking">
                            Thinking...
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          {/* =========================================
              CHAT COMPOSER
              ========================================= */}

          <section className="composer">
            <textarea
              value={message}
              onChange={handleMessageChange}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ForgeAI to ${mode.toLowerCase()}...`}
              rows={1}
              disabled={isStreaming}
            />

            <div className="composer-toolbar">
              <div className="composer-info">
                <span>{mode} Mode</span>

                <span className="separator">•</span>

                <span>Groq</span>

                <span className="separator">•</span>

                <span>Enter to send</span>
              </div>

              <button
                className="send-button"
                disabled={
                  !message.trim() || isStreaming
                }
                onClick={() => {
                  void handleSend();
                }}
              >
                {isStreaming
                  ? "Thinking..."
                  : "Send"}

                <span>
                  {isStreaming ? "..." : "↑"}
                </span>
              </button>
            </div>
          </section>

          <p className="composer-hint">
            Enter to send • Shift + Enter for a new line
            • ForgeAI can make mistakes. Review generated
            code before using it in production.
          </p>
        </main>
      </div>
    </div>
  );
}

export default App;
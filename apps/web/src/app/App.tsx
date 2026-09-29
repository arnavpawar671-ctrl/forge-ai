import React, { useState } from "react";
import { useChat } from "../features/chat/hooks/useChat";

function App() {
  const {
    messages,
    isStreaming,
    sendMessage,
  } = useChat();

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

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    // Enter sends the message.
    // Shift + Enter creates a new line.
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

          <span>
            Backend connected
          </span>
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
              <span className="footer-label">
                MODEL
              </span>

              <span className="footer-value">
                Groq
              </span>
            </div>

            <div>
              <span className="footer-label">
                MODE
              </span>

              <span className="footer-value">
                {mode}
              </span>
            </div>
          </div>
        </aside>

        {/* =========================================
            CHAT AREA
            ========================================= */}

        <main className="chat-area">

          {/* =========================================
              MESSAGES
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

              <h2>
                Build something powerful.
              </h2>

              <p>
                ForgeAI is your AI software engineer
                for coding, debugging, architecture,
                testing, security and DevOps.
              </p>
            </section>
          ) : (
            <section className="messages">
              {messages.map((item, index) => (
                <div
                  key={`${item.role}-${index}`}
                  className={
                    item.role === "user"
                      ? "message message-user"
                      : "message message-assistant"
                  }
                >
                  <div className="message-role">
                    {item.role === "user"
                      ? "You"
                      : "ForgeAI"}
                  </div>

                  <div className="message-content">
                    {item.content ||
                      (isStreaming &&
                      index === messages.length - 1
                        ? "Thinking..."
                        : "")}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* =========================================
              CHAT COMPOSER
              ========================================= */}

          <section className="composer">
            <textarea
              value={message}
              onChange={(event) =>
                setMessage(event.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder={
                `Ask ForgeAI to ${mode.toLowerCase()}...`
              }
              rows={4}
              disabled={isStreaming}
            />

            <div className="composer-toolbar">
              <div className="composer-info">
                <span>
                  {mode} Mode
                </span>

                <span className="separator">
                  •
                </span>

                <span>
                  Groq
                </span>

                <span className="separator">
                  •
                </span>

                <span>
                  Enter to send
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
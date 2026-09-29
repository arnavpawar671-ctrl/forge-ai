import { useState } from "react";

function App() {
  // Stores whatever the user is currently typing.
  const [message, setMessage] = useState("");

  // Currently selected engineering mode.
  const [mode, setMode] = useState("Explain");

  // Engineering modes supported by ForgeAI.
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

  return (
    <div className="app">

      {/* =========================================
          TOP NAVIGATION
          ========================================= */}

      <header className="topbar">

        <div className="brand">

          {/* ForgeAI logo */}
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

        {/* Backend connection indicator */}
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

                <span>
                  {item}
                </span>

              </button>

            ))}

          </nav>


          {/* Sidebar footer */}

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


          {/* Welcome section */}

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
              ForgeAI is your AI software engineer for
              coding, debugging, architecture, testing,
              security and DevOps.
            </p>

          </section>


          {/* =========================================
              CHAT COMPOSER
              ========================================= */}

          <section className="composer">

            <textarea
              value={message}

              onChange={(event) =>
                setMessage(event.target.value)
              }

              placeholder={
                `Ask ForgeAI to ${mode.toLowerCase()}...`
              }

              rows={4}
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

              </div>


              <button
                className="send-button"

                disabled={!message.trim()}

                onClick={() => {
                  console.log(
                    "Message:",
                    message,
                  );

                  console.log(
                    "Mode:",
                    mode,
                  );
                }}
              >
                Send
                <span>↑</span>
              </button>

            </div>

          </section>


          {/* Small disclaimer */}

          <p className="composer-hint">
            ForgeAI can make mistakes. Review generated
            code before using it in production.
          </p>

        </main>

      </div>

    </div>
  );
}

export default App;
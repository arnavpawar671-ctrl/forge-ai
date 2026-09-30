import { useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";

export function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setBusy(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName.trim(),
            },
          },
        });

        if (error) throw error;

        setMessage(
          "Account created. Check your email if confirmation is enabled.",
        );
        setMode("signin");
      } else {
        const { error } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (error) throw error;
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Authentication failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <img src="/logo.svg" alt="ForgeAI" className="auth-logo" />
        <p className="auth-eyebrow">FORGEAI</p>
        <h1>
          {mode === "signin"
            ? "Welcome back."
            : "Create your ForgeAI account."}
        </h1>
        <p className="auth-subtitle">
          Your chats, preferences and engineering workspace
          will follow your account.
        </p>

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Display name"
              autoComplete="name"
            />
          )}

          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            type="email"
            autoComplete="email"
            required
          />

          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            minLength={6}
            required
          />

          <button type="submit" disabled={busy}>
            {busy
              ? "Please wait..."
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        {message && <p className="auth-message">{message}</p>}

        <button
          className="auth-switch"
          type="button"
          onClick={() => {
            setMode((current) =>
              current === "signin" ? "signup" : "signin",
            );
            setMessage("");
          }}
        >
          {mode === "signin"
            ? "Need an account? Create one"
            : "Already have an account? Sign in"}
        </button>
      </section>
    </main>
  );
}

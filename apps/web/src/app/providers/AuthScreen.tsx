import React, { useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";

export function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setBusy(true);

    try {
      const normalizedEmail = email.trim();

      if (!normalizedEmail) {
        setMessage("Please enter your email address.");
        return;
      }

      if (password.length < 6) {
        setMessage("Password must be at least 6 characters.");
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              display_name: displayName.trim(),
            },
          },
        });

        if (error) {
          console.error("ForgeAI signup error:", error);
          throw error;
        }

        console.log("ForgeAI signup successful:", {
          userId: data.user?.id,
          email: data.user?.email,
        });

        setMessage(
          "Account created successfully. Check your email if confirmation is enabled.",
        );

        setMode("signin");
        setPassword("");
      } else {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password,
          });

        if (error) {
          console.error("ForgeAI signin error:", error);
          throw error;
        }

        console.log("ForgeAI signin successful:", {
          userId: data.user?.id,
          email: data.user?.email,
        });
      }
    } catch (error) {
      console.error("ForgeAI authentication error:", error);

      if (error instanceof Error) {
        setMessage(error.message);
      } else {
        setMessage("Authentication failed. Check the browser console.");
      }
    } finally {
      setBusy(false);
    }
  }

  function toggleMode() {
    setMode((current) =>
      current === "signin" ? "signup" : "signin",
    );

    setMessage("");
    setPassword("");
  }

  return (
    <main className="auth-screen">
      <section className="auth-card">
        <img
          src="/logo.svg"
          alt="ForgeAI"
          className="auth-logo"
        />

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
              onChange={(event) =>
                setDisplayName(event.target.value)
              }
              placeholder="Display name"
              autoComplete="name"
            />
          )}

          <input
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="Email"
            type="email"
            autoComplete="email"
            required
          />

          <input
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder="Password"
            type="password"
            autoComplete={
              mode === "signin"
                ? "current-password"
                : "new-password"
            }
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

        {message && (
          <p
            className="auth-message"
            role="alert"
          >
            {message}
          </p>
        )}

        <button
          className="auth-switch"
          type="button"
          onClick={toggleMode}
        >
          {mode === "signin"
            ? "Need an account? Create one"
            : "Already have an account? Sign in"}
        </button>
      </section>
    </main>
  );
}


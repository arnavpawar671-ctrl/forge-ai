import React, { useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import logoUrl from "../../assets/logo.svg";

export function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setVerificationSent(false);
    setBusy(true);

    try {
      const normalizedEmail = email.trim();

      if (!normalizedEmail) throw new Error("Please enter your email address.");
      if (password.length < 6) throw new Error("Password must be at least 6 characters.");

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: { display_name: displayName.trim() } },
        });

        if (error) {
          console.error("ForgeAI signup error:", error);
          throw error;
        }

        console.log("ForgeAI signup response:", data);
        setMessage("Account created. Check your email and verify your account before signing in.");
        setVerificationSent(true);
        setPassword("");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) {
          console.error("ForgeAI signin error:", error);
          if (error.message === "Email not confirmed") {
            throw new Error("Your email is not verified yet. Open the ForgeAI verification email, then sign in again.");
          }
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
      } else if (typeof error === "object" && error !== null && "message" in error) {
        setMessage(String(error.message));
      } else {
        setMessage("Authentication failed. Check the browser console for details.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleResendVerification() {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setMessage("Enter your email address first.");
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
      });

      if (error) {
        console.error("ForgeAI verification resend error:", error);
        throw error;
      }

      setMessage("Verification email sent again. Check your inbox and spam folder.");
      setVerificationSent(true);
    } catch (error) {
      console.error("ForgeAI verification resend failed:", error);
      setMessage(error instanceof Error ? error.message : "Could not resend the verification email.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    setMessage("");
    setBusy(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });

      if (error) {
        console.error("ForgeAI Google sign-in error:", error);
        throw error;
      }
    } catch (error) {
      console.error("ForgeAI Google authentication error:", error);
      setMessage(error instanceof Error ? error.message : "Google sign-in failed. Check the browser console for details.");
      setBusy(false);
    }
  }

  function toggleMode() {
    setMode((current) => (current === "signin" ? "signup" : "signin"));
    setMessage("");
    setPassword("");
    setVerificationSent(false);
    setShowPassword(false);
  }

  return (
    <main className="auth-screen">
      <div className="auth-grid" aria-hidden="true" />
      <div className="auth-orb auth-orb-one" aria-hidden="true" />
      <div className="auth-orb auth-orb-two" aria-hidden="true" />

      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo-frame">
            <img src={logoUrl} alt="ForgeAI" className="auth-logo" />
          </div>
          <div>
            <strong>ForgeAI</strong>
            <span>AI SOFTWARE ENGINEER</span>
          </div>
        </div>

        <div className="auth-intro">
          <div className="auth-status">
            <span />
            Your engineering workspace
          </div>
          <h1>{mode === "signin" ? "Build without the busywork." : "Start building with ForgeAI."}</h1>
          <p>
            {mode === "signin"
              ? "Sign in to continue your conversations, preferences and engineering workspace."
              : "Create an account and keep your ForgeAI workspace synced across sessions."}
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label className="auth-field">
              <span>Display name</span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="How should ForgeAI call you?"
                autoComplete="name"
              />
            </label>
          )}

          <label className="auth-field">
            <span>Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <div className="auth-password-wrap">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                minLength={6}
                required
              />
              <button
                className="auth-password-toggle"
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <button className="auth-primary" type="submit" disabled={busy}>
            <span>{busy ? "Working..." : mode === "signin" ? "Sign in to ForgeAI" : "Create ForgeAI account"}</span>
            {!busy && <span aria-hidden="true">→</span>}
          </button>
        </form>

        <div className="auth-divider"><span>OR CONTINUE WITH</span></div>

        <button className="auth-google" type="button" onClick={handleGoogleSignIn} disabled={busy}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M21.35 12.27c0-.68-.06-1.34-.18-1.97H12v3.73h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.7 2.91-4.2 2.91-7.15Z"/>
            <path fill="#34A853" d="M12 21.72c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.29v2.53A9.73 9.73 0 0 0 12 21.72Z"/>
            <path fill="#FBBC05" d="M6.53 13.81A5.84 5.84 0 0 1 6.22 12c0-.63.11-1.24.31-1.81V7.66H3.29A9.73 9.73 0 0 0 2.27 12c0 1.57.38 3.05 1.02 4.34l3.24-2.53Z"/>
            <path fill="#EA4335" d="M12 6.16c1.43 0 2.71.49 3.72 1.46l2.78-2.78C16.83 3.18 14.63 2.28 12 2.28a9.73 9.73 0 0 0-8.71 5.38l3.24 2.53c.77-2.31 2.93-4.03 5.47-4.03Z"/>
          </svg>
          Continue with Google
        </button>

        {message && <p className="auth-message" role="alert">{message}</p>}

        {verificationSent && (
          <button className="auth-resend" type="button" onClick={() => void handleResendVerification()} disabled={busy}>
            Resend verification email
          </button>
        )}

        <button className="auth-switch" type="button" onClick={toggleMode}>
          {mode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}
        </button>

        <p className="auth-footer">By continuing, you agree to use ForgeAI responsibly.</p>
      </section>
    </main>
  );
}

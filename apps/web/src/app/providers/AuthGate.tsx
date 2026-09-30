import React from "react";
import type { ReactNode } from "react";
import { useAuth } from "./AuthProvider";
import { AuthScreen } from "./AuthScreen";

export function AuthGate({
  children,
}: {
  children: ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="auth-screen">
        <div className="auth-loading">Loading ForgeAI…</div>
      </main>
    );
  }

  return user ? children : <AuthScreen />;
}

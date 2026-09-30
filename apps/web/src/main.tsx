import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import App from "./app/App";
import { AuthGate } from "./app/providers/AuthGate";
import { AuthProvider } from "./app/providers/AuthProvider";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("ForgeAI root element was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <AuthGate>
        <App />
      </AuthGate>
    </AuthProvider>
  </StrictMode>,
);

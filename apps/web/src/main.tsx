// React strict mode helps detect potential problems during development.
import { StrictMode } from "react";

// ReactDOM is responsible for mounting our React application.
import { createRoot } from "react-dom/client";

// Global application styles.
import "./styles/index.css";

// Main ForgeAI application.
import App from "./app/App";

// Find the HTML element where React should render.
const rootElement = document.getElementById("root");

// Fail early if the root element doesn't exist.
if (!rootElement) {
  throw new Error("ForgeAI root element was not found.");
}

// Mount the application.
createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
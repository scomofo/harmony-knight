import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { App } from "./router.tsx";
import { registerSW } from "virtual:pwa-register";

// Keep the installed app fresh: apply new versions as soon as they're ready.
registerSW({ immediate: true });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
